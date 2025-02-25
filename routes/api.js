"use strict";
const Boardmodel = require("../models").Board;
const mongoose = require("mongoose");

module.exports = function (app) {
  app
    .route("/api/threads/:board")
    .post(async (req, res) => {
      console.log(
        "----------------------------THREADS POST----------------------------"
      );
      const { text, delete_password } = req.body;

      // boardはbodyにないときはparamsから取得
      let board = req.body.board;
      if (!board) {
        board = req.params.board;
      }
      const newThread = {
        text: text,
        delete_password: delete_password,
        replies: [],
      };
      // board探して追加,編集
      let boardData = await Boardmodel.findOneAndUpdate(
        { name: board },
        { $push: { threads: newThread } },
        { new: true, upsert: true } // 新しいデータを取得＆ボードがなければ作成
      );

      boardData.threads.push(newThread);
      return res.json(newThread);
    })
    .get(async (req, res) => {
      console.log(
        "----------------------------THREADS GET----------------------------"
      );
      const board = req.params.board;
      const boardData = await Boardmodel.findOne({ name: board });
      if (!boardData) {
        return res.json("--no board with this name");
      }

      const threads = boardData.threads
        .sort((a, b) => b.bumped_on - a.bumped_on)
        .slice(0, 10)
        .map((thread) => {
          const { _id, text, created_on, bumped_on, replies } = thread;
          return {
            _id,
            text,
            created_on,
            bumped_on,
            replies: thread.replies
              .sort((a, b) => b.created_on - a.created_on)
              .slice(0, 3)
              .map(({ _id, text, created_on }) => ({ _id, text, created_on })), // 必要なデータのみ返す
            replycount: replies.length,
          };
        });
      res.json(threads);
    })
    .put(async (req, res) => {
      console.log(
        "----------------------------THREADS PUT----------------------------"
      );
      const { thread_id } = req.body;
      const board = req.params.board;

      const boardData = await Boardmodel.findOne({ name: board });
      if (!boardData) {
        return re.json("--board not found--");
      }
      let reportedThread = boardData.threads.id(thread_id);
      reportedThread.reported = true;
      await boardData.save();

      return res.send("reported");
    })
    .delete(async (req, res) => {
      console.log(
        "----------------------------THREADS DELETE----------------------------"
      );
      const { thread_id, delete_password } = req.body;
      const board = req.params.board;

      const boardData = await Boardmodel.findOne({ name: board });
      if (!boardData) {
        return res.json("not found board");
      }
      const thread = boardData.threads.id(thread_id);
      if (!thread) {
        return res.json("not found thread");
      }

      if (thread.delete_password === delete_password) {
        await Boardmodel.updateOne(
          { name: board },
          { $pull: { threads: { _id: thread_id } } }
        ).exec();
        return res.send("success");
      } else {
        return res.send("incorrect password");
      }
    });

  app
    .route("/api/replies/:board")
    .post(async (req, res) => {
      console.log(
        "----------------------------REPLIY POST----------------------------"
      );
      const { text, delete_password, thread_id } = req.body;
      let board = req.params.board;

      if (!text || !delete_password || !thread_id) {
        return res.json("-missing required fields--");
      }

      // board探して追加,編集
      const boardData = await Boardmodel.findOne({ name: board }).exec();
      if (!boardData) {
        return res.json("--board not found--");
      }

      // thread探して追加,編集
      const threadToAddReply = boardData.threads.id(thread_id);
      if (!threadToAddReply) {
        return res.json({ error: "could't find thread check your thread_id" });
      }

      const newReply = {
        text: text,
        delete_password: delete_password,
        created_on: new Date(),
        reported: false,
      };

      threadToAddReply.bumped_on = new Date();
      threadToAddReply.replies.push(newReply);

      await boardData.save();

      return res.json(boardData);
    })
    .get(async (req, res) => {
      const { thread_id } = req.query;
      const board = req.params.board;

      if (!thread_id) {
        return res.json("--thread_id is required--");
      }

      const boardData = await Boardmodel.findOne({ name: board });
      if (!boardData) {
        return res.json("--no board with this name");
      }

      const thread = boardData.threads.id(thread_id);
      if (!thread) {
        return res.json("--thread not found--");
      }

      return res.json({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies.map(({ _id, text, created_on }) => ({
          _id,
          text,
          created_on,
        })),
      });
    })
    .put(async (req, res) => {
      console.log(
        "----------------------------REPLY PUT----------------------------"
      );
      const { thread_id, reply_id } = req.body;
      const board = req.params.board;

      const boardData = await Boardmodel.findOne({ name: board });
      if (!boardData) {
        return res.json("--board not found--");
      }

      let thread = boardData.threads.id(thread_id);
      if (!thread) {
        return res.json("--thread not found--");
      }
      let reply = thread.replies.id(reply_id);
      if (!reply) {
        return res.json("--reply not found--");
      }
      reply.reported = true;
      await boardData.save();

      return res.send("reported");
    })
    .delete(async (req, res) => {
      console.log(
        "----------------------------REPLIYS DELETE----------------------------"
      );
      const { thread_id, reply_id, delete_password } = req.body;
      const board = req.params.board;

      const boardData = await Boardmodel.findOne({ name: board });
      if (!boardData) {
        return res.json("--board not found--");
      }
      const thread = boardData.threads.id(thread_id);
      if (!thread) {
        return res.json("--thread not found--");
      }

      const reply = thread.replies.id(reply_id);
      if (!reply) {
        return res.json("--reply not found--");
      }

      if (reply.delete_password !== delete_password) {
        return res.send("incorrect password");
      }

      reply.text = "[deleted]";

      await boardData.save();

      return res.send("success");
    });
};
