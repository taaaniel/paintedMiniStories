#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

const APK_RELATIVE_PATH = path.join(
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
const APK_SOURCE = path.join(PROJECT_ROOT, APK_RELATIVE_PATH);
const APK_DEST = path.join(DIST_DIR, 'myministories-release.apk');

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    ...options,
  });
  if (res.error) throw res.error;
  if (res.status != null && res.status !== 0) process.exit(res.status);
}

function runCapture(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  return {
    ok: res.status === 0,
    status: res.status ?? 1,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
  };
}

function isValidJavaHome(javaHome) {
  if (!javaHome) return false;
  const javaBin = path.join(
    javaHome,
    'bin',
    process.platform === 'win32' ? 'java.exe' : 'java',
  );
  return fileExists(javaBin);
}

function findJavaHomeMac() {
  const fromEnv = process.env.JAVA_HOME;
  if (isValidJavaHome(fromEnv)) return fromEnv;

  const javaHomeCmd = '/usr/libexec/java_home';
  if (fileExists(javaHomeCmd)) {
    const out = runCapture(javaHomeCmd, ['-v', '17']);
    if (out.ok && isValidJavaHome(out.stdout)) return out.stdout;
  }

  const studioJbr =
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  if (isValidJavaHome(studioJbr)) return studioJbr;

  const jvmRoot = '/Library/Java/JavaVirtualMachines';
  if (isDir(jvmRoot)) {
    const candidates = fs
      .readdirSync(jvmRoot)
      .map((name) => path.join(jvmRoot, name, 'Contents', 'Home'))
      .filter(isValidJavaHome);

    // Prefer JDK 17 if present (heuristic by path name)
    const prefer17 = candidates.find((p) => /17/i.test(p));
    if (prefer17) return prefer17;
    if (candidates[0]) return candidates[0];
  }

  // Homebrew OpenJDK
  const brew = runCapture('brew', ['--prefix', 'openjdk@17']);
  if (brew.ok && brew.stdout) {
    const opt = brew.stdout;
    const home1 = opt; // often has bin/java
    const home2 = path.join(opt, 'libexec', 'openjdk.jdk', 'Contents', 'Home');
    if (isValidJavaHome(home2)) return home2;
    if (isValidJavaHome(home1)) return home1;
  }

  return null;
}

function findJavaHome() {
  if (process.platform === 'darwin') return findJavaHomeMac();

  // Minimal fallback for other OSes: respect JAVA_HOME
  const fromEnv = process.env.JAVA_HOME;
  if (isValidJavaHome(fromEnv)) return fromEnv;
  return null;
}

function ensureGradlewExecutable() {
  if (process.platform === 'win32') return;
  const gradlew = path.join(ANDROID_DIR, 'gradlew');
  if (!fileExists(gradlew)) {
    console.error(`Missing Gradle wrapper: ${gradlew}`);
    process.exit(1);
  }

  try {
    fs.chmodSync(gradlew, 0o755);
  } catch {
    // ignore; if it fails, gradle will fail with a clearer error
  }
}

function main() {
  const args = process.argv.slice(2);
  const wantStacktrace = args.includes('--stacktrace');

  if (!isDir(ANDROID_DIR)) {
    console.error(`Missing android directory: ${ANDROID_DIR}`);
    process.exit(1);
  }

  const javaHome = findJavaHome();
  if (!javaHome) {
    console.error(
      'Java 17 not found. Android release build requires a Java Runtime (JDK 17).',
    );
    console.error('Install one of the following and re-run:');
    console.error('- Android Studio (uses bundled JBR), or');
    console.error(
      '- Homebrew: brew install --cask temurin17   (recommended), or',
    );
    console.error('- Homebrew: brew install openjdk@17');
    console.error(
      'Then ensure JAVA_HOME points to JDK 17 (or just re-run this script).',
    );
    process.exit(1);
  }

  ensureGradlewExecutable();

  const env = { ...process.env, JAVA_HOME: javaHome };
  env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`;

  console.log(`[android:apk] JAVA_HOME=${javaHome}`);

  const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const gradleArgs = [':app:assembleRelease', '--no-daemon'];
  if (wantStacktrace) gradleArgs.push('--stacktrace');

  run(gradlewCmd, gradleArgs, { cwd: ANDROID_DIR, env });

  if (!fileExists(APK_SOURCE)) {
    console.error('Build finished but APK not found at:');
    console.error(`- ${APK_SOURCE}`);
    process.exit(1);
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.copyFileSync(APK_SOURCE, APK_DEST);

  console.log('APK built:');
  console.log(`- ${APK_SOURCE}`);
  console.log('Copied to:');
  console.log(`- ${APK_DEST}`);
}

main();
