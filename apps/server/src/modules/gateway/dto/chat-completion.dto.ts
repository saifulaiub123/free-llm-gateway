import { ApiProperty } from '@nestjs/swagger';

/**
 * OpenAI chat message (documentation shape only).
 *
 * NOTE: the gateway forwards the raw request body to the upstream provider verbatim, so the actual
 * `@Body` is typed as the passthrough `ChatRequest` (no DTO stripping). This class exists purely to
 * document the `/v1/chat/completions` body in Swagger.
 */
export class ChatMessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant', 'tool'], example: 'user' })
  role!: string;

  @ApiProperty({ description: 'Message content (string, or an array of parts for vision).' })
  content!: unknown;
}

/** OpenAI chat-completion request (documentation shape; extra fields are forwarded upstream). */
export class ChatCompletionDto {
  @ApiProperty({ example: 'auto', description: '`auto` lets the router pick; or pin a model id.' })
  model!: string;

  @ApiProperty({ type: [ChatMessageDto] })
  messages!: ChatMessageDto[];

  @ApiProperty({ required: false, default: false, description: 'Stream the response as SSE.' })
  stream?: boolean;

  @ApiProperty({ required: false, type: Number })
  temperature?: number;

  @ApiProperty({ required: false, type: Array, description: 'Tool/function definitions.' })
  tools?: unknown[];
}
