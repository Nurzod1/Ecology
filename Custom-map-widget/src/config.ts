import { ImmutableObject } from 'seamless-immutable';

export interface Config {
  objectId?: string;
}

export type IMConfig = ImmutableObject<Config>;
