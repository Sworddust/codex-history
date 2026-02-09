const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const outputZipPath = path.join(repoRoot, "codex-history-skill.zip");
const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-history-pack-"));
const stagingSkillDir = path.join(stagingRoot, "codex-history");

function copyPath(sourceRelativePath) {
  const sourcePath = path.join(repoRoot, sourceRelativePath);
  const targetPath = path.join(stagingSkillDir, sourceRelativePath);
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

function copyScriptFiles() {
  const scriptDir = path.join(stagingSkillDir, "scripts");
  fs.mkdirSync(scriptDir, { recursive: true });

  const scriptFiles = ["formatters.js", "history-cli.js", "history-core.js"];
  for (const fileName of scriptFiles) {
    const sourcePath = path.join(repoRoot, "scripts", fileName);
    const targetPath = path.join(scriptDir, fileName);
    fs.cpSync(sourcePath, targetPath);
  }
}

try {
  if (fs.existsSync(outputZipPath)) {
    fs.rmSync(outputZipPath, { force: true });
  }

  fs.mkdirSync(stagingSkillDir, { recursive: true });

  copyPath("SKILL.md");
  copyPath("README.md");
  copyPath("README.en.md");
  copyPath("CHANGELOG.md");
  copyPath("LICENSE");
  copyScriptFiles();

  if (process.platform === "win32") {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${stagingSkillDir}' -DestinationPath '${outputZipPath}'`,
      ],
      { stdio: "inherit" }
    );
  } else {
    execFileSync("zip", ["-r", outputZipPath, "codex-history"], {
      cwd: stagingRoot,
      stdio: "inherit",
    });
  }

  console.log(`Packed: ${outputZipPath}`);
} finally {
  fs.rmSync(stagingRoot, { force: true, recursive: true });
}
