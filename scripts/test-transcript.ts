import { YoutubeTranscript } from 'youtube-transcript';

const videos = [
  { type: 'Short video', url: 'dQw4w9WgXcQ' }, // Rick Astley
  { type: 'Long video (Podcast)', url: 'n3Xv_g3g-mA' }, // Huberman podcast example
];

async function run() {
  for (const video of videos) {
    console.log(`\nTesting: ${video.type} (${video.url})`);
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(video.url);
      const segmentCount = transcript.length;
      const fullText = transcript.map(t => t.text).join(' ');
      const transcriptLength = fullText.length;
      const first500 = fullText.substring(0, 500);

      console.log(`✅ Success!`);
      console.log(`- Segment count: ${segmentCount}`);
      console.log(`- Transcript length (chars): ${transcriptLength}`);
      console.log(`- First 500 chars:\n${first500}...\n`);
    } catch (error) {
      console.error(`❌ Failed:`, error);
    }
  }
}

run();
