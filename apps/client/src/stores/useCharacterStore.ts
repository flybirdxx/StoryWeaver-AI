// Zustand Store：全局角色状态管理
// 用于管理角色列表等全局状态，替代 React hooks 的局部状态管理

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Character } from '@storyweaver/shared';

export interface CharacterState {
  characters: Character[];
  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
}

export const useCharacterStore = create<CharacterState>()(
  immer((set) => ({
    characters: [],
    setCharacters: (characters: Character[]) => set({ characters }),
    addCharacter: (character: Character) =>
      set((state) => {
        const index = state.characters.findIndex((c) => c.id === character.id);
        if (index >= 0) {
          state.characters[index] = character;
        } else {
          state.characters.push(character);
        }
      }),
    updateCharacter: (id: string, updates: Partial<Character>) =>
      set((state) => {
        const index = state.characters.findIndex((c) => c.id === id);
        if (index >= 0) {
          state.characters[index] = { ...state.characters[index], ...updates };
        }
      }),
    removeCharacter: (id: string) =>
      set((state) => {
        state.characters = state.characters.filter((c) => c.id !== id);
      })
  }))
);

