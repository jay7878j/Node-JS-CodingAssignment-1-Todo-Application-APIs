const express = require("express");
const { open } = require("sqlite");
const sqlite = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite.Database,
    });

    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (error) {
    console.log(`DB error: ${error.message}`);
  }
};

initializeDatabaseAndServer();

const convertToCamelCase = (data) => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  };
};

//
const statusCheck = (request, response, next) => {
  const reqQueryData = request.query;
  const reqBodyData = request.body;
  const check = Object.keys(reqBodyData).length === 0;

  let data;
  check ? (data = reqQueryData) : (data = reqBodyData);

  const isValueIn = (checkList, value) => {
    return !checkList.includes(value);
  };

  const statusValues = ["TO DO", "IN PROGRESS", "DONE", undefined];
  const statusCheck = isValueIn(statusValues, data.status);

  const priorityValues = ["HIGH", "MEDIUM", "LOW", undefined];
  const priorityCheck = isValueIn(priorityValues, data.priority);

  const categoryValues = ["WORK", "HOME", "LEARNING", undefined];
  const categoryCheck = isValueIn(categoryValues, data.category);

  let date;
  if (data.date !== undefined) {
    date = data.date;
  } else if (data.dueDate !== undefined) {
    date = data.dueDate;
  }

  let dateCheck = isValid(new Date(date));
  //   console.log(date, dateCheck);

  switch (true) {
    case statusCheck:
      response.status(400);
      response.send("Invalid Todo Status");
      break;

    case priorityCheck:
      response.status(400);
      response.send("Invalid Todo Priority");
      break;

    case categoryCheck:
      response.status(400);
      response.send("Invalid Todo Category");
      break;

    case dateCheck === false && date !== undefined:
      response.status(400);
      response.send("Invalid Due Date");
      break;

    default:
      next();
  }
};

// API 1 Get Todos data based on Query Parameters

app.get("/todos/", statusCheck, async (request, response) => {
  let getTodosQuery;
  const { priority, status, category, search_q = "" } = request.query;

  switch (true) {
    //   Scenario 1 Based on priority & status
    case priority !== undefined && status !== undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%" AND
            priority LIKE "%${priority}%" AND
            status LIKE "%${status}%"
        `;
      break;

    //   Scenario 2 Based on category & priority
    case category !== undefined && priority !== undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%" AND
            priority LIKE "%${priority}%" AND
            category LIKE "%${category}%"
        `;
      break;

    //   Scenario 3 Based on category & status
    case category !== undefined && status !== undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%" AND
            category LIKE "%${category}%" AND
            status LIKE "%${status}%"
        `;
      break;

    //   Scenario 4 Based on status
    case status !== undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%" AND
            status LIKE "%${status}%"
        `;
      break;

    //   Scenario 5 Based on priority
    case priority !== undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%" AND
            priority LIKE "%${priority}%"
        `;
      break;

    //  Scenario 6 Based on category
    case category !== undefined:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%" AND
            category LIKE "%${category}%"
        `;
      break;

    //   Scenario 7 Based on search
    default:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo
        WHERE
            todo LIKE "%${search_q}%"
        `;
      break;
  }

  const responseData = await db.all(getTodosQuery);
  response.send(responseData.map((eachTodo) => convertToCamelCase(eachTodo)));
});

// API 2 Get a specific todo based on the todo ID

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const todoItemQuery = `
    SELECT * FROM todo WHERE id=${todoId};
    `;
  const responseData = await db.get(todoItemQuery);
  response.send(convertToCamelCase(responseData));
});

// API 3 Get all todos with a specific due date in the query parameter

app.get(`/agenda/`, statusCheck, async (request, response) => {
  const { date } = request.query;
  const dueDate = format(new Date(date), "yyyy-MM-dd");

  const dueDateTodosQuery = `
    SELECT * FROM todo WHERE due_date = "${dueDate}"
    `;

  const responseData = await db.all(dueDateTodosQuery);
  response.send(responseData.map((eachTodo) => convertToCamelCase(eachTodo)));
});

// API 4 Create a new todo in the todo table

app.post("/todos/", statusCheck, async (request, response) => {
  const newTodoData = request.body;
  const { id, todo, priority, status, category, dueDate } = newTodoData;
  const formateDate = format(new Date(dueDate), "yyyy-MM-dd");

  const createTodoQuery = `
    INSERT INTO 
        todo (id, todo, priority, status, category, due_date)
    VALUES 
        (${id}, "${todo}", "${priority}", "${status}", "${category}", "${formateDate}");
    `;

  await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

// API 5 Updates the details of a specific todo based on the todo ID

app.put("/todos/:todoId/", statusCheck, async (request, response) => {
  const { todoId } = request.params;
  const updateTodoData = request.body;
  //   const dateCheck = isValid(new Date(date));
  //   const todoValueChecks = statusCheck(updateTodoData);

  const todoItemQuery = `
    SELECT * FROM todo WHERE id = ${todoId}
    `;

  const todoItemData = await db.get(todoItemQuery);

  let responseStatus;

  switch (true) {
    case updateTodoData.status !== undefined:
      responseStatus = "Status";
      break;

    case updateTodoData.category !== undefined:
      responseStatus = "Category";
      break;

    case updateTodoData.priority !== undefined:
      responseStatus = "Priority";
      break;

    case updateTodoData.todo !== undefined:
      responseStatus = "Todo";
      break;

    case updateTodoData.dueDate !== undefined:
      responseStatus = "Due Date";
      break;
  }

  const {
    priority = todoItemData.priority,
    category = todoItemData.category,
    status = todoItemData.status,
    dueDate = todoItemData.due_date,
    todo = todoItemData.todo,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
        todo
    SET 
        todo = "${todo}",
        priority = "${priority}",
        status = "${status}",
        category = "${category}",
        due_date = "${dueDate}"
    WHERE 
        id = ${todoId};
  `;

  await db.run(updateTodoQuery);
  response.send(`${responseStatus} Updated`);
});

// API 6 Deletes a todo from the todo table based on the todo ID

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteTodoQuery = `
    DELETE FROM todo WHERE id=${todoId}
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
