import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { DeclarationPanel } from "./DeclarationPanel";

describe("the panel declaring a cluster", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  function renderPanel() {
    const onClose = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <main data-testid="outside">the page</main>
        <DeclarationPanel open declaration={undefined} onClose={onClose} onCreated={vi.fn()} />
      </QueryClientProvider>,
    );
    return onClose;
  }

  test("closes on a click beside it while empty, as the other panels", () => {
    const onClose = renderPanel();
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("stays open on a click beside it once an entry is typed", () => {
    const onClose = renderPanel();
    const name = screen.getByLabelText("Name");
    fireEvent.change(name, { target: { value: "prdclu" } });
    // The entry is kept even once the field is left.
    name.blur();
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(onClose).not.toHaveBeenCalled();

    // Cleared, the form closes again on a click beside it.
    fireEvent.change(name, { target: { value: "" } });
    name.blur();
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
