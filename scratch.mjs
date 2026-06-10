import { execSync } from 'child_process';
try {
  execSync(`npx convex run trigger:trigger '{"videoId":"jd7c2ynr2ggbvc4hkx77442ej5880947"}'`, { stdio: 'inherit' });
} catch (e) {
  console.error(e);
}
