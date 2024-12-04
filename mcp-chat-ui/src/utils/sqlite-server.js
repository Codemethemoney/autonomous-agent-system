const Database = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');

class SQLiteServer {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
        this.isConnected = false;
    }

    async ensureDbDirectory() {
        const dbDir = path.dirname(this.dbPath);
        try {
            await fs.access(dbDir);
        } catch {
            await fs.mkdir(dbDir, { recursive: true });
        }
    }

    async connect() {
        try {
            await this.ensureDbDirectory();
            this.db = new Database(this.dbPath, { verbose: console.log });
            this.isConnected = true;
            console.log(`Connected to SQLite database at ${this.dbPath}`);
            return true;
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async testConnection() {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            const stmt = this.db.prepare('SELECT 1');
            const result = stmt.get();
            return true;
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }

    async analyzeSchema() {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            const tables = this.getTables();
            const schema = {};

            for (const table of tables) {
                const columns = this.getTableInfo(table);
                schema[table] = columns;
            }

            return schema;
        } catch (error) {
            throw new Error(`Schema analysis failed: ${error.message}`);
        }
    }

    getTables() {
        const query = `
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name NOT LIKE 'sqlite_%'
        `;
        
        const rows = this.db.prepare(query).all();
        return rows.map(row => row.name);
    }

    getTableInfo(tableName) {
        const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`);
        const rows = stmt.all();
        
        return rows.map(row => ({
            name: row.name,
            type: row.type,
            notNull: row.notnull === 1,
            defaultValue: row.dflt_value,
            isPrimaryKey: row.pk === 1
        }));
    }

    getTableStats() {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected');
        }

        try {
            const tables = this.getTables();
            const stats = {};

            for (const table of tables) {
                const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${table}"`);
                const count = countStmt.get().count;

                let size = 0;
                try {
                    const sizeStmt = this.db.prepare('SELECT SUM("pgsize") as size FROM "dbstat" WHERE name = ?');
                    const result = sizeStmt.get(table);
                    size = result ? result.size : 0;
                } catch {
                    // If dbstat is not available, estimate size
                    size = count * 100; // rough estimate
                }

                stats[table] = { rowCount: count, sizeBytes: size };
            }

            return stats;
        } catch (error) {
            throw new Error(`Failed to get table stats: ${error.message}`);
        }
    }

    async getRowCount(tableName) {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const result = stmt.get();
        return result ? result.count : 0;
    }

    async getTableSize(tableName) {
        let size = 0;
        try {
            const sizeStmt = this.db.prepare('SELECT SUM("pgsize") as size FROM "dbstat" WHERE name = ?');
            const result = sizeStmt.get(tableName);
            size = result ? result.size : 0;
        } catch {
            // If dbstat is not available, estimate size
            const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`);
            const count = countStmt.get().count;
            size = count * 100; // rough estimate
        }
        return size;
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isConnected = false;
        }
    }
}

module.exports = SQLiteServer;
