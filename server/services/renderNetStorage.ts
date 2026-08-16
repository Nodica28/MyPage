import {pool} from "../db";

// Interface for RenderNet response records
export interface RenderNetResponse {
  id: number;
  renderNetId: string;
  outputUrl: string | null;
  status: "succeeded" | "failed" | "processing";
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
  userId: number;
  headshotRequestId: number | null;
}

// Interface for update data
export interface RenderNetUpdateData {
  status: "succeeded" | "failed" | "processing";
  outputUrl?: string;
  error?: string;
  completedAt?: Date;
}

export class RenderNetStorage {
  // Initialize tables if they don't exist
  async initialize(): Promise<void> {
    try {
      // Check if the renderNetResponses table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'rendernet_responses'
        );
      `);

      if (!tableExists.rows[0].exists) {
        console.log("Creating renderNetResponses table...");
        await pool.query(`
          CREATE TABLE rendernet_responses (
            id SERIAL PRIMARY KEY,
            rendernet_id TEXT NOT NULL,
            output_url TEXT,
            status TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMP,
            error TEXT,
            user_id INTEGER REFERENCES users(id),
            headshot_request_id INTEGER
          );
        `);
        console.log("renderNetResponses table created successfully.");
      }
    } catch (error) {
      console.error("Failed to initialize RenderNet storage:", error);
      throw error;
    }
  }

  // Create a new RenderNet response record
  async createResponse(data: {
    renderNetId: string;
    status: "succeeded" | "failed" | "processing";
    userId: number;
    headshotRequestId?: number;
  }): Promise<RenderNetResponse> {
    try {
      const values: any[] = [
        data.renderNetId,
        data.status,
        data.userId,
        data.headshotRequestId || null
      ];
      const {rows} = await pool.query(
        `
        INSERT INTO rendernet_responses (
          rendernet_id, status, user_id, headshot_request_id, created_at
        ) VALUES (
          $1, $2, $3, $4, NOW()
        ) RETURNING *
      `,
        values
      );

      return this.mapRowToResponse(rows[0]);
    } catch (error) {
      console.error("Failed to create RenderNet response record:", error);
      throw error;
    }
  }

  // Update an existing RenderNet response record
  async updateResponse(
    id: number,
    data: RenderNetUpdateData
  ): Promise<RenderNetResponse> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [id];
      let paramIndex = 2;

      if (data.status) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.outputUrl !== undefined) {
        updateFields.push(`output_url = $${paramIndex++}`);
        values.push(data.outputUrl);
      }

      if (data.error !== undefined) {
        updateFields.push(`error = $${paramIndex++}`);
        values.push(data.error);
      }

      if (data.completedAt) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        values.push(data.completedAt);
      } else if (data.status === "succeeded" || data.status === "failed") {
        updateFields.push("completed_at = NOW()");
      }

      const {rows} = await pool.query(
        `
        UPDATE rendernet_responses
        SET ${updateFields.join(", ")}
        WHERE id = $1
        RETURNING *
      `,
        values
      );

      return this.mapRowToResponse(rows[0]);
    } catch (error) {
      console.error("Failed to update RenderNet response record:", error);
      throw error;
    }
  }

  // Get a RenderNet response by ID
  async getResponse(id: number): Promise<RenderNetResponse | null> {
    try {
      const {rows} = await pool.query(
        `
        SELECT * FROM rendernet_responses WHERE id = $1
      `,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToResponse(rows[0]);
    } catch (error) {
      console.error("Failed to get RenderNet response:", error);
      throw error;
    }
  }

  // Get responses by headshot request ID
  async getResponsesByHeadshotRequestId(
    headshotRequestId: number
  ): Promise<RenderNetResponse[]> {
    try {
      const {rows} = await pool.query(
        `
        SELECT * FROM rendernet_responses 
        WHERE headshot_request_id = $1
        ORDER BY created_at DESC
      `,
        [headshotRequestId]
      );

      return rows.map(this.mapRowToResponse);
    } catch (error) {
      console.error(
        "Failed to get RenderNet responses by headshot request ID:",
        error
      );
      throw error;
    }
  }

  private mapRowToResponse(row: any): RenderNetResponse {
    return {
      id: row.id,
      renderNetId: row.rendernet_id,
      outputUrl: row.output_url,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      error: row.error,
      userId: row.user_id,
      headshotRequestId: row.headshot_request_id
    };
  }
}

// Create singleton instance
export const renderNetStorage = new RenderNetStorage();
