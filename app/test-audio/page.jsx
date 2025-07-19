import MessageAudio from "../../components/ChatBox/MessageAudio";

export default function TestAudio() {
  return (
    <div style={{ maxWidth: 400, margin: 40 }}>
      <h2>Test Audio</h2>
      <MessageAudio url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" duration="" />
    </div>
  );
}
