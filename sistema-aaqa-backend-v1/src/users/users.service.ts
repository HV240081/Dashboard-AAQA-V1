import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private entityManager: EntityManager,
  ) {}

  private readonly baseRoleIds = [1, 2, 3, 4, 5];

  private readonly managedAreas = ['ONG', 'Community', 'FIS', 'Cortes'];

  async ensureUserPermissionSchema() {
    const columns = await this.entityManager.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'`
    );
    const existing = new Set((columns || []).map((row: any) => row.COLUMN_NAME));
    const addColumn = async (name: string, definition: string) => {
      if (!existing.has(name)) {
        await this.entityManager.query(`ALTER TABLE usuarios ADD COLUMN ${name} ${definition}`);
        existing.add(name);
      }
    };

    await addColumn('activo', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER temporal');
    await addColumn('is_custom', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER activo');
    await addColumn('custom_role_id', 'INT NULL AFTER is_custom');

    await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS roles_personalizados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        descripcion TEXT NULL,
        solo_lectura TINYINT(1) NOT NULL DEFAULT 0,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS roles_personalizados_permisos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rol_personalizado_id INT NOT NULL,
        area VARCHAR(40) NOT NULL,
        puede_ver TINYINT(1) NOT NULL DEFAULT 1,
        puede_editar TINYINT(1) NOT NULL DEFAULT 0,
        puede_subir_proyectos TINYINT(1) NOT NULL DEFAULT 0,
        puede_subir_seguimiento TINYINT(1) NOT NULL DEFAULT 0,
        puede_eliminar TINYINT(1) NOT NULL DEFAULT 0,
        UNIQUE KEY uniq_role_area (rol_personalizado_id, area),
        INDEX idx_role_permissions_role (rol_personalizado_id),
        CONSTRAINT fk_role_permissions_role
          FOREIGN KEY (rol_personalizado_id) REFERENCES roles_personalizados(id)
          ON DELETE CASCADE
      )
    `);

    const customRoleRows = await this.entityManager.query(`SELECT id FROM roles WHERE id = 6 LIMIT 1`);
    if (!customRoleRows.length) {
      await this.entityManager.query(
        `INSERT INTO roles (id, nombre, descripcion, puede_editar_todo, solo_ver)
         VALUES (6, 'PERSONALIZADO', 'Rol flexible administrado desde Usuarios y Permisos', 0, 0)`
      );
    }
  }

  private isAdminUser(user: any) {
    return user?.rolId === 1 || user?.rol_id === 1 || user?.rolId === 3 || user?.rol_id === 3;
  }

  assertAdminUser(user: any) {
    if (!this.isAdminUser(user)) {
      throw new ForbiddenException('Solo Geo y Violeta pueden administrar usuarios y permisos.');
    }
  }

  private normalizePermissionInput(permissions: any[] = [], readOnly = false) {
    return this.managedAreas.map((area) => {
      const source = permissions.find((item) => item?.area === area) || {};
      const canView = Boolean(source.canView ?? source.puede_ver ?? source.canEdit ?? source.puede_editar);
      const canEdit = !readOnly && Boolean(source.canEdit ?? source.puede_editar);
      return {
        area,
        canView,
        canEdit,
        canUploadProjects: !readOnly && Boolean(source.canUploadProjects ?? source.puede_subir_proyectos),
        canUploadTracking: !readOnly && Boolean(source.canUploadTracking ?? source.puede_subir_seguimiento),
        canDelete: !readOnly && Boolean(source.canDelete ?? source.puede_eliminar),
      };
    }).filter((permission) => permission.canView || permission.canEdit || permission.canUploadProjects || permission.canUploadTracking || permission.canDelete);
  }

  private async saveRolePermissions(roleId: number, permissions: any[], readOnly = false) {
    const normalized = this.normalizePermissionInput(permissions, readOnly);
    await this.entityManager.query(`DELETE FROM roles_personalizados_permisos WHERE rol_personalizado_id = ?`, [roleId]);
    for (const permission of normalized) {
      await this.entityManager.query(
        `INSERT INTO roles_personalizados_permisos
          (rol_personalizado_id, area, puede_ver, puede_editar, puede_subir_proyectos, puede_subir_seguimiento, puede_eliminar)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          roleId,
          permission.area,
          permission.canView ? 1 : 0,
          permission.canEdit ? 1 : 0,
          permission.canUploadProjects ? 1 : 0,
          permission.canUploadTracking ? 1 : 0,
          permission.canDelete ? 1 : 0,
        ],
      );
    }
  }

  private mapCustomRoleRow(role: any, permissions: any[] = []) {
    return {
      id: role.id,
      name: role.nombre,
      description: role.descripcion || '',
      isReadOnly: Number(role.solo_lectura) === 1,
      active: Number(role.activo) === 1,
      permissions: permissions.map((permission) => ({
        area: permission.area,
        canView: Number(permission.puede_ver) === 1,
        canEdit: Number(permission.puede_editar) === 1,
        canUploadProjects: Number(permission.puede_subir_proyectos) === 1,
        canUploadTracking: Number(permission.puede_subir_seguimiento) === 1,
        canDelete: Number(permission.puede_eliminar) === 1,
      })),
    };
  }

  async getCustomRoleWithPermissions(roleId: number) {
    await this.ensureUserPermissionSchema();
    const roles = await this.entityManager.query(`SELECT * FROM roles_personalizados WHERE id = ? LIMIT 1`, [roleId]);
    if (!roles.length) return null;
    const permissions = await this.entityManager.query(
      `SELECT * FROM roles_personalizados_permisos WHERE rol_personalizado_id = ? ORDER BY area ASC`,
      [roleId],
    );
    return this.mapCustomRoleRow(roles[0], permissions);
  }

  async findAllCustomRoles() {
    await this.ensureUserPermissionSchema();
    const roles = await this.entityManager.query(`SELECT * FROM roles_personalizados ORDER BY nombre ASC`);
    const permissions = await this.entityManager.query(`SELECT * FROM roles_personalizados_permisos ORDER BY area ASC`);
    return roles.map((role: any) => this.mapCustomRoleRow(
      role,
      permissions.filter((permission: any) => Number(permission.rol_personalizado_id) === Number(role.id)),
    ));
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.ensureUserPermissionSchema();
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    await this.ensureUserPermissionSchema();
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(options: { page: number; limit: number }) {
    await this.ensureUserPermissionSchema();
    const [users, total] = await this.usersRepository.findAndCount({
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      order: { id: 'ASC' },
    });
    return {
      users,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async create(data: {
    nombre: string;
    apellido: string;
    email: string;
    password_hash: string;
    rol_id: number;
    temporal: boolean;
  }) {
    await this.ensureUserPermissionSchema();
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async update(id: number, data: Partial<User>) {
    await this.ensureUserPermissionSchema();
    await this.usersRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number) {
    await this.ensureUserPermissionSchema();
    await this.usersRepository.delete(id);
    return { success: true };
  }

  async updatePassword(id: number, password_hash: string) {
    await this.ensureUserPermissionSchema();
    await this.usersRepository.update(id, { password_hash });
    return { success: true };
  }

  async createCustomRole(body: any) {
    await this.ensureUserPermissionSchema();
    const name = (body.name || body.nombre || '').toString().trim();
    if (!name) throw new BadRequestException('Debe indicar el nombre del rol.');
    const description = (body.description || body.descripcion || '').toString().trim() || null;
    const isReadOnly = Boolean(body.isReadOnly || body.soloLectura);
    const result = await this.entityManager.query(
      `INSERT INTO roles_personalizados (nombre, descripcion, solo_lectura, activo) VALUES (?, ?, ?, 1)`,
      [name, description, isReadOnly ? 1 : 0],
    );
    const roleId = result.insertId;
    await this.saveRolePermissions(roleId, body.permissions || [], isReadOnly);
    return this.getCustomRoleWithPermissions(roleId);
  }

  async updateCustomRole(id: number, body: any) {
    await this.ensureUserPermissionSchema();
    const existing = await this.getCustomRoleWithPermissions(id);
    if (!existing) throw new NotFoundException('Rol personalizado no encontrado.');
    const name = (body.name || body.nombre || existing.name).toString().trim();
    const description = (body.description ?? body.descripcion ?? existing.description ?? '').toString().trim() || null;
    const isReadOnly = Boolean(body.isReadOnly ?? body.soloLectura ?? existing.isReadOnly);
    await this.entityManager.query(
      `UPDATE roles_personalizados SET nombre = ?, descripcion = ?, solo_lectura = ? WHERE id = ?`,
      [name, description, isReadOnly ? 1 : 0, id],
    );
    await this.saveRolePermissions(id, body.permissions || existing.permissions || [], isReadOnly);
    return this.getCustomRoleWithPermissions(id);
  }

  async deleteCustomRole(id: number) {
    await this.ensureUserPermissionSchema();
    const users = await this.entityManager.query(`SELECT id FROM usuarios WHERE custom_role_id = ? LIMIT 1`, [id]);
    if (users.length) {
      throw new BadRequestException('No puede eliminar este rol porque hay usuarios asignados.');
    }
    await this.entityManager.query(`DELETE FROM roles_personalizados WHERE id = ?`, [id]);
    return { success: true };
  }

  async createCustomUser(body: any) {
    await this.ensureUserPermissionSchema();
    const nombre = (body.nombre || '').toString().trim();
    const apellido = (body.apellido || '').toString().trim();
    const email = (body.email || '').toString().trim().toLowerCase();
    const passwordHash = body.password_hash;
    const customRoleId = Number(body.customRoleId || body.custom_role_id || 0);
    if (!nombre || !apellido || !email || !passwordHash || !customRoleId) {
      throw new BadRequestException('Nombre, apellido, correo, contraseña y rol personalizado son obligatorios.');
    }
    const role = await this.getCustomRoleWithPermissions(customRoleId);
    if (!role) throw new BadRequestException('El rol personalizado seleccionado no existe.');
    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException('Ya existe un usuario con ese correo.');
    const user = this.usersRepository.create({
      nombre,
      apellido,
      email,
      password_hash: passwordHash,
      rol_id: 6,
      temporal: false,
      activo: true,
      is_custom: true,
      custom_role_id: customRoleId,
    } as Partial<User>);
    const saved = await this.usersRepository.save(user);
    return this.getManagedUserById(saved.id);
  }

  async updateManagedUser(id: number, body: any) {
    await this.ensureUserPermissionSchema();
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const updateData: any = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.apellido !== undefined) updateData.apellido = body.apellido;
    if (body.email !== undefined) updateData.email = body.email.toString().trim().toLowerCase();
    if (body.customRoleId !== undefined || body.custom_role_id !== undefined) {
      if (!user.is_custom && this.baseRoleIds.includes(Number(user.rol_id))) {
        throw new BadRequestException('Los usuarios base no pueden cambiarse a roles personalizados.');
      }
      const roleId = Number(body.customRoleId ?? body.custom_role_id);
      const role = await this.getCustomRoleWithPermissions(roleId);
      if (!role) throw new BadRequestException('El rol personalizado seleccionado no existe.');
      updateData.custom_role_id = roleId;
      updateData.rol_id = 6;
      updateData.is_custom = true;
    }
    if (Object.keys(updateData).length > 0) {
      await this.usersRepository.update(id, updateData);
    }
    return this.getManagedUserById(id);
  }

  async setUserActive(id: number, active: boolean) {
    await this.ensureUserPermissionSchema();
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    await this.usersRepository.update(id, { activo: active } as Partial<User>);
    return this.getManagedUserById(id);
  }

  async deleteManagedUser(id: number) {
    await this.ensureUserPermissionSchema();
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!user.is_custom || this.baseRoleIds.includes(Number(user.rol_id))) {
      throw new BadRequestException('Los usuarios base solo pueden suspenderse; no se pueden eliminar.');
    }
    await this.usersRepository.delete(id);
    return { success: true };
  }

  private async getManagedUserById(id: number) {
    const users = await this.entityManager.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol_id, u.temporal, u.activo, u.is_custom, u.custom_role_id,
              rp.nombre as custom_role_name
       FROM usuarios u
       LEFT JOIN roles_personalizados rp ON rp.id = u.custom_role_id
       WHERE u.id = ?
       LIMIT 1`,
      [id],
    );
    if (!users.length) return null;
    return this.mapManagedUser(users[0]);
  }

  private mapManagedUser(row: any) {
    return {
      id: row.id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      rolId: Number(row.rol_id),
      roleName: this.getFixedRoleName(Number(row.rol_id), row.custom_role_name),
      temporal: Number(row.temporal) === 1 || row.temporal === true,
      active: Number(row.activo) !== 0,
      isCustom: Number(row.is_custom) === 1 || Number(row.rol_id) === 6,
      customRoleId: row.custom_role_id ? Number(row.custom_role_id) : null,
      canDelete: Number(row.is_custom) === 1 || Number(row.rol_id) === 6,
      canSuspend: true,
    };
  }

  private getFixedRoleName(roleId: number, customRoleName?: string) {
    switch (roleId) {
      case 1: return 'Geo / Administrador';
      case 2: return 'Juana / Solo lectura';
      case 3: return 'Violeta / Gerencia';
      case 4: return 'Jose Manuel / Cortes Formativas';
      case 5: return 'Irvin / Desarrollo Comunitario';
      case 6: return customRoleName || 'Rol personalizado';
      default: return 'Usuario';
    }
  }

  async getPermissionManagementData() {
    await this.ensureUserPermissionSchema();
    const rows = await this.entityManager.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol_id, u.temporal, u.activo, u.is_custom, u.custom_role_id,
              rp.nombre as custom_role_name
       FROM usuarios u
       LEFT JOIN roles_personalizados rp ON rp.id = u.custom_role_id
       ORDER BY u.id ASC`
    );
    return {
      users: rows.map((row: any) => this.mapManagedUser(row)),
      customRoles: await this.findAllCustomRoles(),
      areas: this.managedAreas,
    };
  }

  async getUserWithPermissions(userId: number) {
    await this.ensureUserPermissionSchema();
    const user = await this.findById(userId);
    if (!user) return null;
    if (Number((user as any).activo) === 0 || (user as any).activo === false) {
      return null;
    }

    const rolId = user.rol_id;
    
    let editableCategories: string[] = [];
    let viewableCategories: string[] = [];
    let canEditAll = false;
    let canOnlyView = false;
    let rolNombre = '';

    switch (rolId) {
      case 1:
        rolNombre = 'ADMIN_General';
        canEditAll = true;
        editableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        viewableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        break;
      case 2:
        rolNombre = 'DIRECTOR';
        canOnlyView = true;
        viewableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        editableCategories = [];
        break;
      case 3:
        rolNombre = 'GERENTE';
        canEditAll = true;
        editableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        viewableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        break;
      case 4:
        rolNombre = 'FORMACION';
        editableCategories = ['formacion_dc'];
        viewableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        break;
      case 5:
        rolNombre = 'TECNICO_PROYECTOS';
        editableCategories = [];
        viewableCategories = ['ONG', 'ES', 'DC', 'formacion_ong', 'formacion_dc', 'incubadora'];
        break;
      default:
        if (user.custom_role_id) {
          const customRole = await this.getCustomRoleWithPermissions(user.custom_role_id);
          rolNombre = customRole?.name || 'ROL_PERSONALIZADO';
          const canEditAreas = (customRole?.permissions || []).filter((permission: any) => permission.canEdit);
          const canViewAreas = (customRole?.permissions || []).filter((permission: any) => permission.canView || permission.canEdit);
          const mapArea = (area: string) => {
            if (area === 'Community') return 'DC';
            if (area === 'FIS') return 'ES';
            if (area === 'Cortes') return 'formacion_dc';
            return area;
          };
          editableCategories = canEditAreas.map((permission: any) => mapArea(permission.area));
          viewableCategories = canViewAreas.map((permission: any) => mapArea(permission.area));
          canOnlyView = editableCategories.length === 0;
        } else {
          rolNombre = 'USUARIO';
          viewableCategories = ['ONG', 'ES', 'DC'];
          editableCategories = [];
        }
    }

    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      roles: [rolNombre],
      temporal: user.temporal === true,
      active: Number((user as any).activo) !== 0 && (user as any).activo !== false,
      isCustom: Number((user as any).is_custom) === 1 || (user as any).is_custom === true || rolId === 6,
      customRoleId: user.custom_role_id || null,
      editableCategories,
      viewableCategories,
      canEditAll,
      canOnlyView,
    };
  }
}
