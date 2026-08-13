import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat ESLint config using Next 16's native flat configs directly.
 *
 * eslint-config-next/core-web-vitals and /typescript both export flat config
 * arrays, so there's no need for the legacy FlatCompat bridge — which crashes
 * on eslint-plugin-react's circular plugin reference.
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts"],
  },
];

export default config;