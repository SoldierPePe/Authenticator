"use strict";
// Runs tests via puppeteer. Do not compile using webpack.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const path_1 = __importDefault(require("path"));
const merge_1 = __importDefault(require("lodash/merge"));
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
};
function runTests() {
    return __awaiter(this, void 0, void 0, function* () {
        const puppeteerArgs = [
            `--load-extension=${path_1.default.resolve(__dirname, "../test/chrome")}`,
            // for CI
            "--no-sandbox",
            "--lang=en-US,en"
        ];
        const browser = yield puppeteer_1.default.launch({
            ignoreDefaultArgs: ["--disable-extensions"],
            args: puppeteerArgs,
            // chrome extensions don't work in headless
            headless: false,
            executablePath: process.env.PUPPETEER_EXEC_PATH,
        });
        const mochaPage = yield browser.newPage();
        yield mochaPage.goto("chrome-extension://bhghoamapcdpbohphigoooaddinpkbai/view/test.html");
        // by setting this env var, console logging works for both components and testing
        if (process.env.ENABLE_CONSOLE) {
            mochaPage.on("console", consoleMessage => console.log(consoleMessage.text()));
        }
        const results = yield mochaPage.evaluate(() => {
            return new Promise((resolve) => {
                window.addEventListener("testsComplete", () => {
                    resolve({
                        testResults: window.__mocha_test_results__,
                    });
                });
                if (window.__mocha_test_results__.completed) {
                    resolve({
                        testResults: window.__mocha_test_results__,
                    });
                }
            });
        });
        let failedTest = false;
        let display = {};
        if (results === null || results === void 0 ? void 0 : results.testResults.tests) {
            for (const test of results.testResults.tests) {
                let tmp = {};
                test.path.reduce((acc, current, index) => {
                    return acc[current] = test.path.length - 1 === index ? test : {};
                }, tmp);
                display = (0, merge_1.default)(display, tmp);
            }
        }
        const printDisplayTests = (display) => {
            for (const key in display) {
                if (typeof display[key].status === "string") {
                    const test = display[key];
                    switch (test.status) {
                        case "passed":
                            console.log(`${colors.green}✓${colors.reset} ${test.title}`);
                            break;
                        case "failed":
                            console.log(`${colors.red}✗ ${test.title}${colors.reset}`);
                            if (test.err) {
                                console.log(test.err);
                            }
                            failedTest = true;
                            break;
                        case "pending":
                            console.log(`- ${test.title}`);
                            break;
                    }
                }
                else {
                    console.log(key);
                    console.group();
                    printDisplayTests(display[key]);
                }
            }
            console.groupEnd();
        };
        printDisplayTests(display);
        process.exit(failedTest ? 1 : 0);
    });
}
runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
