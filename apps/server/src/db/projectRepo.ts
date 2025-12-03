import { desc, eq } from 'drizzle-orm';
import { db } from './client';
import { projects, type ProjectRow } from './schema';

export type Project = ProjectRow;

// GET /api/projects 对应的查询：按更新时间倒序
export const listProjects = async (): Promise<Project[]> => {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return rows;
};

// GET /api/projects/:id
export const getProjectById = async (id: string): Promise<Project | undefined> => {
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row;
};

// 对应 project.js 中的 insertProject
export interface NewProjectInput {
  id: string;
  name: string;
  tags: unknown[];
  totalPanels: number;
  generatedPanels: number;
  createdAt: string;
  updatedAt: string;
}

export const insertProject = async (project: NewProjectInput): Promise<void> => {
  const payload = {
    id: project.id,
    name: project.name,
    tags: JSON.stringify(project.tags || []),
    totalPanels: project.totalPanels,
    generatedPanels: project.generatedPanels,
    data: JSON.stringify(project),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };

  await db.insert(projects).values(payload);
};

// 对应 project.js 中的 updateProjectRow
export const updateProject = async (project: NewProjectInput): Promise<void> => {
  const payload = {
    name: project.name,
    tags: JSON.stringify(project.tags || []),
    totalPanels: project.totalPanels,
    generatedPanels: project.generatedPanels,
    data: JSON.stringify(project),
    updatedAt: project.updatedAt
  };

  await db.update(projects).set(payload).where(eq(projects.id, project.id));
};


