import { desc, eq } from 'drizzle-orm';
import { db } from './client';
import { characters, type CharacterRow } from './schema';

export type Character = CharacterRow;

// GET /api/characters
export const listCharacters = async (): Promise<Character[]> => {
  const rows = await db.select().from(characters).orderBy(desc(characters.updatedAt));
  return rows;
};

// GET /api/characters/:id
export const getCharacterById = async (id: string): Promise<Character | undefined> => {
  const [row] = await db.select().from(characters).where(eq(characters.id, id));
  return row;
};

export interface NewCharacterInput {
  id: string;
  name: string;
  description: string;
  tags: unknown[];
  basePrompt: string;
  imageUrl: string | null;
  imageIsUrl: boolean;
  createdAt: string;
  updatedAt: string;
}

// 对应 character.js 中的 insertCharacter
export const insertCharacter = async (character: NewCharacterInput): Promise<void> => {
  const payload = {
    id: character.id,
    name: character.name,
    description: character.description,
    tags: JSON.stringify(character.tags || []),
    basePrompt: character.basePrompt,
    imageUrl: character.imageUrl,
    imageIsUrl: character.imageIsUrl ? 1 : 0,
    data: JSON.stringify(character),
    createdAt: character.createdAt,
    updatedAt: character.updatedAt
  };

  await db.insert(characters).values(payload);
};

// 对应 character.js 中的 updateCharacterRow
export const updateCharacter = async (character: NewCharacterInput): Promise<void> => {
  const payload = {
    name: character.name,
    description: character.description,
    tags: JSON.stringify(character.tags || []),
    basePrompt: character.basePrompt,
    imageUrl: character.imageUrl,
    imageIsUrl: character.imageIsUrl ? 1 : 0,
    data: JSON.stringify(character),
    updatedAt: character.updatedAt
  };

  await db.update(characters).set(payload).where(eq(characters.id, character.id));
};

// 对应 DELETE /api/characters/:id
export const deleteCharacter = async (id: string): Promise<number> => {
  const result = await db.delete(characters).where(eq(characters.id, id));
  // drizzle 对 better-sqlite3 的 delete 返回值包含 changes 字段
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result as any).changes ?? 0;
};


