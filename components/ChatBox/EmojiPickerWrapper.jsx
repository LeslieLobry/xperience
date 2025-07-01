"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function EmojiPickerWrapper({ onSelect }) {
  return <Picker data={data} onEmojiSelect={onSelect} theme="light" />;
}
