import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre' })
  nombre: string;

  @Column({ name: 'apellido' })
  apellido: string;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'password_hash' })
  password_hash: string;

  @Column({ name: 'rol_id' })
  rol_id: number;

  @Column({ name: 'temporal', type: 'boolean', default: false })
  temporal: boolean;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'is_custom', type: 'boolean', default: false })
  is_custom: boolean;

  @Column({ name: 'custom_role_id', type: 'int', nullable: true })
  custom_role_id: number | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
