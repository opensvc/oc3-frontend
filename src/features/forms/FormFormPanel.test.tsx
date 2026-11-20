import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { FormFormPanel } from "./FormFormPanel";

describe("the panel editing a form", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  test("closes on a click beside it until a field is changed", () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <main data-testid="outside">the page</main>
        <FormFormPanel
          open
          form={{ id: 7, form_name: "deploy", form_type: "custo", form_folder: "/", form_yaml: "" }}
          onClose={onClose}
        />
      </QueryClientProvider>,
    );
    const clickBeside = () => {
      (document.activeElement as HTMLElement | null)?.blur();
      fireEvent.pointerDown(screen.getByTestId("outside"));
    };
    const name = screen.getByDisplayValue("deploy");
    fireEvent.change(name, { target: { value: "deploy2" } });
    clickBeside();
    expect(onClose).not.toHaveBeenCalled();
    // Back to the saved value: nothing to drop any more.
    fireEvent.change(name, { target: { value: "deploy" } });
    clickBeside();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
