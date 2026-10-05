import { seedUsers } from './seed-data';

export const emulatorUsers = seedUsers.map((user) => ({
  ...user,
  password: 'EmulatorOnly123!',
}));
