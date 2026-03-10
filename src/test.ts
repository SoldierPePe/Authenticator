import "mocha";
import { MochaReporter } from "./mochaReporter";
import sinon from "sinon";

const modules = import.meta.glob("./test/**/*.{ts,tsx}", { eager: true });

mocha.setup({
  // @ts-expect-error - typings are wrong
  reporter: MochaReporter,
  rootHooks: {
    afterEach() {
      sinon.restore();
    },
  },
});

mocha.run();
