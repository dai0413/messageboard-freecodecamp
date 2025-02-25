const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReplySchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
});
const ThreadsSchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  reported: { type: Boolean, default: false },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  replies: { type: [ReplySchema] },
});
const BoardSchema = new Schema({
  name: { type: String },
  threads: { type: [ThreadsSchema] },
});

const Board = mongoose.model("Board", BoardSchema);

module.exports = { Board };
