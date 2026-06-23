import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { ChatRequest } from '@gateway/provider-adapters';
import { RoutingService } from '../routing/routing.service.js';
import { RoutingStrategyRepository } from '../routing/routing-strategy.repository.js';
import type {
  RequestCapabilities,
  RoutingCandidate,
} from '../routing/types/routing-candidate.js';

/** Default strategy used when the user has set no default and sent no `X-Routing-Strategy` header. */
const FALLBACK_STRATEGY_TYPE = 'balanced';

/**
 * Gateway orchestration (TASK-051/053): resolves the routing strategy, derives the request's required
 * capabilities, and builds the ordered fallback chain. Kept out of the controller so the HTTP concern
 * (headers, streaming, `@Res`) stays thin.
 */
@Injectable()
export class GatewayService {
  constructor(
    private readonly routing: RoutingService,
    private readonly strategies: RoutingStrategyRepository,
  ) {}

  /** The strategy type to route with: the request header, else the user's default, else balanced. */
  async resolveStrategyType(userId: number, header?: string): Promise<string> {
    if (header) {
      return header;
    }
    const def = await this.strategies.findDefault(userId);
    return def?.type ?? FALLBACK_STRATEGY_TYPE;
  }

  /** Builds the ordered candidate chain for a chat request (validates the minimal OpenAI shape). */
  async buildChain(
    userId: number,
    body: ChatRequest,
    header?: string,
  ): Promise<RoutingCandidate[]> {
    if (typeof body.model !== 'string' || !Array.isArray(body.messages)) {
      throw new BadRequestException('`model` and `messages` are required');
    }
    const strategyType = await this.resolveStrategyType(userId, header);
    const chain = await this.routing.buildChain(
      userId,
      body.model,
      strategyType,
      this.capsOf(body),
    );
    // WHY: an empty chain means no enabled model satisfies the request's required capabilities
    // (e.g. an image request with no vision-capable model). Surface it as 422 with a stable
    // machine-readable `code` rather than letting the executor return a misleading 503.
    if (chain.length === 0) {
      throw new UnprocessableEntityException({
        code: 'no_capable_model',
        message: 'No enabled model satisfies the requested capabilities',
      });
    }
    return chain;
  }

  /**
   * Derives required capabilities from the request so `ChainFilter` restricts candidates (TASK-053):
   * image content → vision, a non-empty `tools` array → tools, `response_format: json_object` → json.
   */
  capsOf(body: ChatRequest): RequestCapabilities {
    return {
      vision: this.hasImageContent(body),
      tools: Array.isArray(body.tools) && body.tools.length > 0,
      json: this.wantsJsonMode(body),
    };
  }

  /** True when any message carries an `image_url` content part (OpenAI vision shape). */
  private hasImageContent(body: ChatRequest): boolean {
    return body.messages.some((message) => {
      const content = (message as { content?: unknown }).content;
      return (
        Array.isArray(content) &&
        content.some((part) => (part as { type?: string }).type === 'image_url')
      );
    });
  }

  /** True when the request asks for JSON mode (`response_format.type === 'json_object'`). */
  private wantsJsonMode(body: ChatRequest): boolean {
    const responseFormat = (body as Record<string, unknown>).response_format as
      | { type?: string }
      | undefined;
    return responseFormat?.type === 'json_object';
  }
}
