import type { Config } from 'vike/types';
import vikeReact from 'vike-react/config';
import vikeReactQuery from 'vike-react-query/config';

export default {
  extends: [vikeReact, vikeReactQuery],
} satisfies Config;
