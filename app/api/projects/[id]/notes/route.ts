import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/projects/[id]/notes - Get all notes for a project, optionally filtered by workflow step
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const workflowStep = searchParams.get('workflow_step');

    let sql = 'SELECT * FROM project_notes WHERE project_id = $1';
    const params_array: any[] = [projectId];
    let paramIndex = 2;

    if (workflowStep) {
      sql += ` AND workflow_step = $${paramIndex}`;
      params_array.push(workflowStep);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params_array);
    return NextResponse.json({ notes: result.rows });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/notes - Add a new note
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const { workflow_step, note_text, created_by } = body;

    if (!workflow_step || !note_text) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow_step, note_text' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO project_notes (project_id, workflow_step, note_text, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await query(sql, [
      projectId,
      workflow_step,
      note_text,
      created_by || null,
    ]);

    return NextResponse.json({ note: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note', details: error.message },
      { status: 500 }
    );
  }
}

