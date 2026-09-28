import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SearchView from "./SearchView";

vi.mock("react-router-dom", () => ({ useParams: () => ({}) }));
vi.mock("src/components/log/LogDetails/LogDetailsContainer", () => ({ default: () => <div>Details</div> }));
vi.mock("components/search", () => ({ SearchResults: () => null }));
vi.mock("components/search/LogbookBrowser", () => ({ default: () => <div>Logbooks</div> }));
vi.mock("src/hooks/useEnhancedSearchParams", () => ({ useEnhancedSearchParams: () => ({ isSearchActive: false }) }));
afterEach(cleanup);

it("resizes with the keyboard, enforces limits and restores the default on double click", () => {
  render(<SearchView />);
  const separator = screen.getByRole("separator", { name: "Resize logbook sidebar" });
  expect(separator.previousElementSibling.textContent).toBe("Logbooks");
  expect(separator.nextElementSibling.textContent).toBe("Details");
  fireEvent.keyDown(separator, { key: "ArrowRight" });
  expect(separator.getAttribute("aria-valuenow")).toBe("41");
  fireEvent.keyDown(separator, { key: "End" });
  fireEvent.keyDown(separator, { key: "ArrowRight" });
  expect(separator.getAttribute("aria-valuenow")).toBe("65");
  fireEvent.keyDown(separator, { key: "Home" });
  fireEvent.keyDown(separator, { key: "ArrowLeft" });
  expect(separator.getAttribute("aria-valuenow")).toBe("20");
  fireEvent.doubleClick(separator);
  expect(separator.parentElement.style.getPropertyValue("--logbook-width")).toBe("38.5%");
});
