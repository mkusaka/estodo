import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();

    let nextId = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      nextId += 1;
      return `generated-${nextId}` as `${string}-${string}-${string}-${string}-${string}`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds a todo, projects it into the list, and stores the event", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("新しいtodo"), "Write docs");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(screen.getByDisplayValue("Write docs")).toBeInTheDocument();
    expect(screen.getByText("todo.added")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("estodo.events.v1") ?? "[]")).toHaveLength(1);
  });

  it("undoes the last active event by appending undo.performed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("新しいtodo"), "Toggle me");
    await user.click(screen.getByRole("button", { name: "追加" }));
    await user.click(screen.getByRole("button", { name: "Toggle meを完了にする" }));

    expect(screen.getByRole("button", { name: "Toggle meを未完了にする" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByRole("button", { name: "Toggle meを完了にする" })).toBeInTheDocument();
    expect(screen.getByText("undo.performed")).toBeInTheDocument();
  });
});
