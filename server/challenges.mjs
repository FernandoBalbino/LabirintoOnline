import {mazeChallenges as original} from './original-challenges.mjs';
import {extraHardware,browserChallenges} from './extra-challenges.mjs';
export {mazePowers,mazeEvents} from './original-challenges.mjs';
export const mazeChallenges=[...original,...extraHardware,...browserChallenges];
export const challengeTemplateCounts=mazeChallenges.reduce((counts,c)=>({...counts,[c.template]:(counts[c.template]||0)+1}),{});
export const challengeById=new Map(mazeChallenges.map(c=>[c.id,c]));
