import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getColumns(table: string) {
    try {
      const results = await this.entityManager.query(`SHOW COLUMNS FROM ${table}`);
      return results.map(col => col.Field);
    } catch (error) {
      return { error: error.message };
    }
  }
}
