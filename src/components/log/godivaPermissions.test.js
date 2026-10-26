import { expect, it } from "vitest";
import { isExperimentResponsible } from "./godivaPermissions";

const experiment = { path: "i:infn:lnf:csn1:atlas" };
const membership = "i:infn:lnf:csn1:atlas::resp:locale";

it("accepts the local responsible membership for ATLAS at LNF", () => {
  const authorization = {
    isMemberOf: [
      "i:infn:lnf:csn1:atlas::aff:ric",
      "g:infn:chaos:grafana:dafne:viewer::ag:m@[i:infn:lnf:csn1:atlas::resp:locale]",
      "s:csn1:atlas::resp:locale",
      "o:csn1:atlas::resp:locale",
      membership,
      "i:infn:lnf:csn1:fase2_atlas::resp:locale"
    ]
  };
  expect(isExperimentResponsible(authorization, experiment)).toBe(true);
});

it("normalizes trailing separators in the selected experiment path", () => {
  expect(isExperimentResponsible({ isMemberOf: [membership] }, { path: `${experiment.path}::` })).toBe(true);
});

it.each([
  "i:infn:roma:csn1:atlas::resp:locale",
  "i:infn:lnf:csn1:cms::resp:locale",
  "i:infn:lnf:csn2:atlas::resp:locale",
  "i:infn:lnf:csn1:atlas::resp:national",
  "i:infn:lnf:csn1:atlas::resp:local",
  "g:infn:chaos:grafana:dafne:viewer::ag:m@[i:infn:lnf:csn1:atlas::resp:locale]",
  "i:infn:lnf:csn1:atlas::member",
  "i:infn:lnf:csn1:atlas:resp:local",
  "i:infn:lnf:csn1:atlas::resp:locale:other",
  "i:infn:lnf::resp:locale"
])("rejects a different membership: %s", (otherMembership) => {
  expect(isExperimentResponsible({ isMemberOf: [otherMembership] }, experiment)).toBe(false);
});

it.each([undefined, null, {}, { isMemberOf: [] }, { isMemberOf: membership }])("rejects missing or malformed authorization: %j", (authorization) => {
  expect(isExperimentResponsible(authorization, experiment)).toBe(false);
});

it("requires a selected experiment", () => {
  expect(isExperimentResponsible({ isMemberOf: [membership] }, null)).toBe(false);
});
