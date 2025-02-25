const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

const Boardmodel = require("../models").Board;

chai.use(chaiHttp);

const checkThreadData = (thread) => {
  assert.property(thread, "_id", "res body array should have a _id");
  assert.property(thread, "text", "res body array should have a text");
  assert.property(
    thread,
    "created_on",
    "res body array should have a created_on"
  );
  assert.property(
    thread,
    "bumped_on",
    "res body array should have a bumped_on"
  );
  assert.property(thread, "replies", "res body array should have a replies");
  assert.property(
    thread,
    "replycount",
    "res body array should have a replycount"
  );

  assert.isString(thread._id, "res body _id should be string");
  assert.isString(thread.text, "res body text should be string");
  assert.isString(thread.created_on, "res body created_on should be string");
  assert.isString(thread.bumped_on, "res body bumped_on should be string");
  assert.isArray(thread.replies, "res body replies should be array");
  assert.isNumber(thread.replycount, "res body replies should be number");
};

const getThread = async () => {
  const createdBoard = await Boardmodel.findOne({
    name: "delete_board",
  }).lean(); // lean() でプレーンなオブジェクトとして取得
  // Board が存在しない場合
  if (!createdBoard) {
    return done(new Error("Board not found"));
  }
  // threads 配列が存在するかチェック
  if (
    !Array.isArray(createdBoard.threads) ||
    createdBoard.threads.length === 0
  ) {
    return done(new Error("No threads found in board"));
  }
  // 最新のスレッドを取得
  const createdThread = createdBoard.threads.sort(
    (a, b) => new Date(b.created_on) - new Date(a.created_on)
  )[0];
  const thread_id = createdThread._id;
  return thread_id;
};

const getReply = async (board, delete_thread_id) => {
  const boardData = await Boardmodel.findOne({
    name: board,
  });
  // Board が存在しない場合
  if (!boardData) {
    return done(new Error("Board not found"));
  }

  const thread = boardData.threads.id(delete_thread_id);
  if (!thread) {
    return done(new Error("Threads not found"));
  }

  // 最初のリプライを取得
  const createdReplies = thread.replies.sort(
    (a, b) => new Date(b.created_on) - new Date(a.created_on)
  )[0];
  const reply_id = createdReplies._id;
  return reply_id;
};

suite("Functional Tests", function () {
  test("Creating a new thread: POST request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post("/api/threads/test_board")
      .send({
        text: "Hello World",
        delete_password: "1234",
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isObject(res.body, "res body should be an object");
        assert.property(res.body, "text", "res body should have text property");
        assert.property(
          res.body,
          "delete_password",
          "res body should have delete_password property"
        );
        assert.property(
          res.body,
          "replies",
          "res body should have replies property"
        );
        assert.isString(res.body.text, "res body text should be a text");
        assert.isString(
          res.body.delete_password,
          "res body delete_password should be a text"
        );
        assert.isArray(res.body.replies, "res body replies should be a array");
        assert.isEmpty(
          res.body.replies,
          "res body replies array should be empty"
        );
        done();
      });
  });
  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .get("/api/threads/test_board")
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, "res body should be an array");
        res.body.forEach((thread) => {
          checkThreadData(thread);
          assert.isAtMost(
            thread.replies.length,
            3,
            "thread replies should have 3 or fewer"
          );
        });
        assert.isAtMost(
          res.body.length,
          10,
          "res body should have 10 or fewer"
        );
        done();
      });
  });
  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", function (done) {
    chai
      .request(server)
      .post("/api/threads/delete_board")
      .send({
        text: "Temporary thread",
        delete_password: "1234",
      })
      .end(async function (err, res) {
        const thread_id = await getThread();

        chai
          .request(server)
          .delete("/api/threads/delete_board")
          .send({
            thread_id: thread_id,
            delete_password: "",
          })
          .end(function (err, res) {
            assert.equal(res.text, "incorrect password");
            done();
          });
      });
  });
  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", function (done) {
    chai
      .request(server)
      .post("/api/threads/delete_board")
      .send({
        text: "Temporary thread",
        delete_password: "1234",
      })
      .end(async function (err, res) {
        const thread_id = await getThread();

        chai
          .request(server)
          .delete("/api/threads/delete_board")
          .send({
            thread_id: thread_id,
            delete_password: "1234",
          })
          .end(function (err, res) {
            assert.equal(res.text, "success");
            done();
          });
      });
  });
  test("Reporting a thread: PUT request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post("/api/threads/delete_board")
      .send({
        text: "Temporary thread",
        delete_password: "1234",
      })
      .end(async function (err, res) {
        const thread_id = await getThread();
        chai
          .request(server)
          .put("/api/threads/delete_board")
          .send({
            thread_id: thread_id,
          })
          .end(function (err, res) {
            assert.equal(res.text, "reported");
            done();
          });
      });
  });

  test("Creating a new reply: POST request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .post("/api/threads/delete_board")
      .send({
        text: "Temporary thread",
        delete_password: "1234",
      })
      .end(async function (err, res) {
        const thread_id = await getThread();
        chai
          .request(server)
          .post("/api/replies/delete_board")
          .send({
            text: "reply test text",
            delete_password: "delete reply",
            thread_id: thread_id,
          })
          .end(function (err, res) {
            assert.property(res.body, "_id", "res body should have a _id");
            assert.property(res.body, "name", "res body should have a name");
            assert.property(
              res.body,
              "threads",
              "res body should have a threads"
            );
            assert.isArray(res.body.threads, "threads should be an array");
            done();
          });
      });
  });

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", async function () {
    const res = await chai
      .request(server)
      .post("/api/threads/delete_board")
      .send({
        text: "Temporary thread",
        delete_password: "1234",
      });

    const thread_id = await getThread();

    const replyRes = await chai
      .request(server)
      .get("/api/replies/delete_board")
      .query({ thread_id: thread_id.toString() });

    assert.isObject(replyRes.body, "res body should be an object");
    assert.property(replyRes.body, "_id", "res body should have a _id");
    assert.property(replyRes.body, "text", "res body should have a text");
    assert.property(
      replyRes.body,
      "created_on",
      "res body should have a created_on"
    );
    assert.property(
      replyRes.body,
      "bumped_on",
      "res body should have a bumped_on"
    );
    assert.property(replyRes.body, "replies", "res body should have a replies");
    assert.isArray(replyRes.body.replies, "replies should be an array");
  });

  let delete_thread_id = "";
  let delete_repley_id = "";
  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password", async function () {
    // スレッドを作成
    await chai.request(server).post("/api/threads/delete_board").send({
      text: "Temporary thread",
      delete_password: "1234",
    });

    delete_thread_id = await getThread();

    // リプライを作成
    await chai.request(server).post("/api/replies/delete_board").send({
      text: "reply test text",
      delete_password: "delete reply",
      thread_id: delete_thread_id,
    });

    delete_repley_id = await getReply("delete_board", delete_thread_id);

    const replyRes = await chai
      .request(server)
      .delete("/api/replies/delete_board")
      .send({
        thread_id: delete_thread_id.toString(),
        reply_id: delete_repley_id.toString(),
        delete_password: "",
      });

    assert.equal(replyRes.text, "incorrect password");
  });

  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password", async function () {
    const replyRes = await chai
      .request(server)
      .delete("/api/replies/delete_board")
      .send({
        thread_id: delete_thread_id.toString(),
        reply_id: delete_repley_id.toString(),
        delete_password: "delete reply",
      });

    assert.equal(replyRes.text, "success");
  });

  test("Reporting a reply: PUT request to /api/replies/{board}", async function () {
    // スレッドを作成
    await chai.request(server).post("/api/threads/delete_board").send({
      text: "Temporary thread",
      delete_password: "1234",
    });

    const put_thread_id = await getThread();

    // リプライを作成
    await chai.request(server).post("/api/replies/delete_board").send({
      text: "reply test text",
      delete_password: "delete reply",
      thread_id: put_thread_id,
    });

    const put_repley_id = await getReply("delete_board", put_thread_id);

    const replyRes = await chai
      .request(server)
      .put("/api/replies/delete_board")
      .send({
        thread_id: put_thread_id.toString(),
        reply_id: put_repley_id.toString(),
      });

    assert.equal(replyRes.text, "reported");
  });
});
