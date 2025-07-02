import { UserProfile } from '@/types/user-profile.type';
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('walking_master.db');



export const initDB = () => {
  db.withTransactionSync(() => {
    db.execSync(
      `CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        goal TEXT
      );`
    );
  });
};

export const getProfile = (): UserProfile | undefined => {
  let profile: UserProfile | undefined;
  db.withTransactionSync(() => {
    const result = db.getFirstSync('SELECT * FROM user_profile LIMIT 1;');
    profile = result as UserProfile | undefined;
  });
  return profile;
};

export const saveProfile = (profile: UserProfile): SQLite.SQLiteRunResult => {
  let result: SQLite.SQLiteRunResult;
  db.withTransactionSync(() => {
    result = db.runSync(
      'INSERT INTO user_profile (name, gender, height, weight, goal) VALUES (?, ?, ?, ?, ?);',
      [profile.name, profile.gender, profile.height, profile.weight, profile.goal ?? null]
    );
  });
  return result!;
};

export const updateProfile = (profile: UserProfile): SQLite.SQLiteRunResult => {
  let result: SQLite.SQLiteRunResult;
  db.withTransactionSync(() => {
    result = db.runSync(
      'UPDATE user_profile SET name=?, gender=?, height=?, weight=?, goal=? WHERE id=?;',
      [profile.name, profile.gender, profile.height, profile.weight, profile.goal ?? null, profile.id ?? null]
    );
  });
  return result!;
};