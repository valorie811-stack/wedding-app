// ESLint 9 flat config for Next 16. eslint-config-next/core-web-vitals
// is a ready-made flat-config array (includes its own ignores).
import next from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    // eslint-config-next ignores /.next at the repo root only, so build output
    // inside agent worktrees got linted — hundreds of errors from Turbopack
    // chunks that drowned out real findings. Generated sources are deliberately
    // NOT ignored here: they lint clean today, and they ship, so keep the cover.
    ignores: ["**/.next/**", ".claude/worktrees/**"],
  },
  ...next,
];

export default eslintConfig;
