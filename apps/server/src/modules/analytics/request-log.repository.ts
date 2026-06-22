import { Injectable } from '@nestjs/common';
import { requestLogs, DatabaseService } from '../../database/index.js';
import { BaseRepository } from '../../common/db/base.repository.js';

/** Persistence for the append-only `request_logs` ledger (one row per `/v1` call). */
@Injectable()
export class RequestLogRepository extends BaseRepository<typeof requestLogs> {
  constructor(database: DatabaseService) {
    super(database, requestLogs, false); // append-only ledger composes baseColumns only
  }
}
