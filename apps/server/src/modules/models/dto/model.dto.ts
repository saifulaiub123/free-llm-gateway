import { ApiProperty } from '@nestjs/swagger';

/** Summary returned by the fetch-models action. */
export class FetchModelsResultDto {
  @ApiProperty({ description: 'Total models discovered and upserted into the catalog.' })
  fetched!: number;

  @ApiProperty({ description: 'How many of the fetched models are free (enabled by default).' })
  free!: number;
}
