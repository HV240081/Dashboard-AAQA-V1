import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
  }

  private async seedUsers() {
    const count = await this.userRepository.count();
    
    if (count === 0) {
      const hash = await bcrypt.hash('Kriete123', 10);
      
      const users = [
        { nombre: 'Geo', apellido: 'Albanés', email: 'geovanny.albanes@fundaciongloriakriete.org', password_hash: hash, rol_id: 1, temporal: false },
        { nombre: 'Juana', apellido: 'Jule', email: 'juana.jule@fundaciongloriakriete.org', password_hash: hash, rol_id: 2, temporal: false },
        { nombre: 'Violeta', apellido: 'Melendez', email: 'violeta.melendez@fundaciongloriakriete.org', password_hash: hash, rol_id: 3, temporal: false },
        { nombre: 'Jose Manuel', apellido: 'Garcia', email: 'jose.garcia@fundaciongloriakriete.org', password_hash: hash, rol_id: 4, temporal: false },
        { nombre: 'Irvin', apellido: 'Montalvo', email: 'irvin.bonilla@fundaciongloriakriete.org', password_hash: hash, rol_id: 5, temporal: false },
      ];
      
      await this.userRepository.save(users);
      console.log('Logueo Exitoso');
    }
  }
}