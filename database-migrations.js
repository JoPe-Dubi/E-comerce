// CompreAqui E-commerce - Sistema de Migração e Versionamento do Banco de Dados
// Gerencia atualizações estruturais e versionamento do schema

const database = require('./database');
const fs = require('fs').promises;
const path = require('path');

class DatabaseMigration {
    constructor() {
        this.currentVersion = '2.0.0';
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.migrations = [];
    }

    // ==================== SISTEMA DE VERSIONAMENTO ====================

    async initializeMigrationTable() {
        await database.run(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                execution_time INTEGER, -- em milissegundos
                checksum TEXT,
                success BOOLEAN DEFAULT 1
            )
        `);

        // Inserir versão atual se não existir
        const currentMigration = await database.get(
            'SELECT * FROM schema_migrations WHERE version = ?',
            [this.currentVersion]
        );

        if (!currentMigration) {
            await database.run(
                'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)',
                [this.currentVersion, 'Initial Schema', this.generateChecksum(this.currentVersion)]
            );
        }
    }

    async getCurrentVersion() {
        const result = await database.get(
            'SELECT version FROM schema_migrations WHERE success = 1 ORDER BY executed_at DESC LIMIT 1'
        );
        return result?.version || '1.0.0';
    }

    async getExecutedMigrations() {
        return database.all(
            'SELECT * FROM schema_migrations WHERE success = 1 ORDER BY executed_at ASC'
        );
    }

    async getPendingMigrations() {
        const executed = await this.getExecutedMigrations();
        const executedVersions = executed.map(m => m.version);
        
        return this.migrations.filter(migration => 
            !executedVersions.includes(migration.version)
        );
    }

    // ==================== DEFINIÇÃO DE MIGRAÇÕES ====================

    defineMigrations() {
        this.migrations = [
            {
                version: '2.0.1',
                name: 'Add product variants support',
                up: async () => {
                    await database.run(`
                        CREATE TABLE IF NOT EXISTS product_variants (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            product_id INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            sku TEXT UNIQUE,
                            price DECIMAL(10,2),
                            stock_quantity INTEGER DEFAULT 0,
                            attributes TEXT, -- JSON: {"color": "red", "size": "M"}
                            is_default BOOLEAN DEFAULT 0,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                        )
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku)
                    `);
                },
                down: async () => {
                    await database.run('DROP TABLE IF EXISTS product_variants');
                }
            },

            {
                version: '2.0.2',
                name: 'Add order tracking and notifications',
                up: async () => {
                    await database.run(`
                        CREATE TABLE IF NOT EXISTS order_tracking (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            order_id INTEGER NOT NULL,
                            status TEXT NOT NULL,
                            message TEXT,
                            location TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
                        )
                    `);

                    await database.run(`
                        CREATE TABLE IF NOT EXISTS notifications (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            type TEXT NOT NULL CHECK(type IN ('order', 'promotion', 'system', 'review')),
                            title TEXT NOT NULL,
                            message TEXT NOT NULL,
                            data TEXT, -- JSON adicional
                            is_read BOOLEAN DEFAULT 0,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_tracking_order ON order_tracking(order_id)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)
                    `);
                },
                down: async () => {
                    await database.run('DROP TABLE IF EXISTS order_tracking');
                    await database.run('DROP TABLE IF EXISTS notifications');
                }
            },

            {
                version: '2.0.3',
                name: 'Add inventory management',
                up: async () => {
                    await database.run(`
                        CREATE TABLE IF NOT EXISTS inventory_movements (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            product_id INTEGER NOT NULL,
                            variant_id INTEGER,
                            type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment', 'reserved', 'cancelled')),
                            quantity INTEGER NOT NULL,
                            previous_stock INTEGER NOT NULL,
                            new_stock INTEGER NOT NULL,
                            reason TEXT,
                            reference_type TEXT, -- 'order', 'return', 'adjustment', etc.
                            reference_id INTEGER,
                            user_id INTEGER,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                        )
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_movements(type)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory_movements(created_at)
                    `);
                },
                down: async () => {
                    await database.run('DROP TABLE IF EXISTS inventory_movements');
                }
            },

            {
                version: '2.0.4',
                name: 'Add analytics and reports',
                up: async () => {
                    await database.run(`
                        CREATE TABLE IF NOT EXISTS analytics_events (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER,
                            session_id TEXT,
                            event_type TEXT NOT NULL,
                            event_name TEXT NOT NULL,
                            properties TEXT, -- JSON
                            page_url TEXT,
                            user_agent TEXT,
                            ip_address TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                        )
                    `);

                    await database.run(`
                        CREATE TABLE IF NOT EXISTS sales_reports (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            report_date DATE NOT NULL,
                            total_orders INTEGER DEFAULT 0,
                            total_revenue DECIMAL(12,2) DEFAULT 0,
                            total_products_sold INTEGER DEFAULT 0,
                            average_order_value DECIMAL(10,2) DEFAULT 0,
                            new_customers INTEGER DEFAULT 0,
                            returning_customers INTEGER DEFAULT 0,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE(report_date)
                        )
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_type, event_name)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at)
                    `);

                    await database.run(`
                        CREATE INDEX IF NOT EXISTS idx_reports_date ON sales_reports(report_date)
                    `);
                },
                down: async () => {
                    await database.run('DROP TABLE IF EXISTS analytics_events');
                    await database.run('DROP TABLE IF EXISTS sales_reports');
                }
            }
        ];
    }

    // ==================== EXECUÇÃO DE MIGRAÇÕES ====================

    async runMigration(migration) {
        const startTime = Date.now();
        
        try {
            console.log(`🔄 Executando migração: ${migration.version} - ${migration.name}`);
            
            // Executar a migração
            await migration.up();
            
            const executionTime = Date.now() - startTime;
            
            // Registrar migração executada
            await database.run(
                `INSERT INTO schema_migrations (version, name, execution_time, checksum, success) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    migration.version,
                    migration.name,
                    executionTime,
                    this.generateChecksum(migration.version + migration.name),
                    1
                ]
            );
            
            console.log(`✅ Migração ${migration.version} executada com sucesso (${executionTime}ms)`);
            return true;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            // Registrar falha na migração
            await database.run(
                `INSERT INTO schema_migrations (version, name, execution_time, checksum, success) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    migration.version,
                    migration.name,
                    executionTime,
                    this.generateChecksum(migration.version + migration.name),
                    0
                ]
            );
            
            console.error(`❌ Erro na migração ${migration.version}:`, error.message);
            throw error;
        }
    }

    async runPendingMigrations() {
        await this.initializeMigrationTable();
        this.defineMigrations();
        
        const pending = await this.getPendingMigrations();
        
        if (pending.length === 0) {
            console.log('📋 Nenhuma migração pendente');
            return;
        }
        
        console.log(`🚀 Executando ${pending.length} migração(ões) pendente(s)...`);
        
        for (const migration of pending) {
            await this.runMigration(migration);
        }
        
        console.log('🎉 Todas as migrações foram executadas com sucesso!');
    }

    async rollbackMigration(version) {
        const migration = this.migrations.find(m => m.version === version);
        
        if (!migration) {
            throw new Error(`Migração ${version} não encontrada`);
        }
        
        if (!migration.down) {
            throw new Error(`Migração ${version} não possui rollback definido`);
        }
        
        try {
            console.log(`🔄 Fazendo rollback da migração: ${version}`);
            
            await migration.down();
            
            // Remover registro da migração
            await database.run(
                'DELETE FROM schema_migrations WHERE version = ?',
                [version]
            );
            
            console.log(`✅ Rollback da migração ${version} executado com sucesso`);
            
        } catch (error) {
            console.error(`❌ Erro no rollback da migração ${version}:`, error.message);
            throw error;
        }
    }

    // ==================== BACKUP E RESTORE ====================

    async createBackup(backupName = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = backupName || `backup-${timestamp}.sql`;
        const backupPath = path.join(__dirname, 'backups', filename);
        
        try {
            // Criar diretório de backup se não existir
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            
            // Obter todas as tabelas
            const tables = await database.all(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );
            
            let sqlDump = `-- CompreAqui Database Backup\n-- Created: ${new Date().toISOString()}\n\n`;
            sqlDump += `PRAGMA foreign_keys=OFF;\n`;
            sqlDump += `BEGIN TRANSACTION;\n\n`;
            
            for (const table of tables) {
                // Schema da tabela
                const schema = await database.get(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                    [table.name]
                );
                
                sqlDump += `-- Table: ${table.name}\n`;
                sqlDump += `DROP TABLE IF EXISTS ${table.name};\n`;
                sqlDump += `${schema.sql};\n\n`;
                
                // Dados da tabela
                const rows = await database.all(`SELECT * FROM ${table.name}`);
                
                if (rows.length > 0) {
                    const columns = Object.keys(rows[0]);
                    const columnNames = columns.join(', ');
                    
                    sqlDump += `-- Data for table: ${table.name}\n`;
                    
                    for (const row of rows) {
                        const values = columns.map(col => {
                            const value = row[col];
                            if (value === null) return 'NULL';
                            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                            return value;
                        }).join(', ');
                        
                        sqlDump += `INSERT INTO ${table.name} (${columnNames}) VALUES (${values});\n`;
                    }
                    
                    sqlDump += '\n';
                }
            }
            
            sqlDump += `COMMIT;\n`;
            sqlDump += `PRAGMA foreign_keys=ON;\n`;
            
            await fs.writeFile(backupPath, sqlDump, 'utf8');
            
            console.log(`💾 Backup criado: ${backupPath}`);
            return backupPath;
            
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error.message);
            throw error;
        }
    }

    async listBackups() {
        const backupsDir = path.join(__dirname, 'backups');
        
        try {
            const files = await fs.readdir(backupsDir);
            const backups = files
                .filter(file => file.endsWith('.sql'))
                .map(file => ({
                    name: file,
                    path: path.join(backupsDir, file),
                    size: 0 // Será preenchido abaixo
                }));
            
            // Obter informações dos arquivos
            for (const backup of backups) {
                const stats = await fs.stat(backup.path);
                backup.size = stats.size;
                backup.created = stats.birthtime;
                backup.modified = stats.mtime;
            }
            
            return backups.sort((a, b) => b.created - a.created);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================

    generateChecksum(data) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(data).digest('hex');
    }

    async validateSchema() {
        try {
            // Verificar integridade das chaves estrangeiras
            await database.run('PRAGMA foreign_key_check');
            
            // Verificar integridade geral
            const result = await database.get('PRAGMA integrity_check');
            
            if (result && result.integrity_check === 'ok') {
                console.log('✅ Schema do banco de dados válido');
                return true;
            } else {
                console.error('❌ Problemas encontrados no schema:', result);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erro na validação do schema:', error.message);
            return false;
        }
    }

    async getSchemaInfo() {
        const tables = await database.all(
            "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );
        
        const indexes = await database.all(
            "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name"
        );
        
        const currentVersion = await this.getCurrentVersion();
        const migrations = await this.getExecutedMigrations();
        
        return {
            version: currentVersion,
            tables: tables.length,
            indexes: indexes.length,
            migrations: migrations.length,
            tableDetails: tables,
            indexDetails: indexes,
            migrationHistory: migrations
        };
    }
}

// Instância singleton
const migrationManager = new DatabaseMigration();

module.exports = migrationManager;