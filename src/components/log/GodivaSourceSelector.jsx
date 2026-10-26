import { Alert, Autocomplete, Button, Stack, TextField } from "@mui/material";
import { godivaApi } from "api/godivaApi";

const nodeLabel = (node) => node.nome || node.descrizione || node.path || "";
const lookupError = (error, resource) => {
  if (error?.status === 401) {
    return "Godiva rejected the user access token (401). Sign in again; if the problem persists, check that Godiva accepts the configured identity provider and client.";
  }
  if (error?.status === "CUSTOM_ERROR") {
    return error.error;
  }
  return `Unable to load ${resource} from Godiva.`;
};
const sameNode = (option, value) => option.path === value.path;
const experimentPathRegexp = (path) =>
  `^${(path ?? "").replace(/:+$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:csn.*:*$`;

export default function GodivaSourceSelector({
  structure,
  experiment,
  onStructureChange,
  onExperimentChange,
  disabled
}) {
  const structures = godivaApi.endpoints.getNodiAdvancedSearch.useQuery({
    pathRegexp: "i:infn",
    value: "Struttura"
  });
  const experiments = godivaApi.endpoints.getNodiAdvancedSearch.useQuery(
    { pathRegexp: experimentPathRegexp(structure?.path), listaDettagli: [] },
    { skip: !structure?.path }
  );

  return (
    <Stack gap={2}>
      <Autocomplete
        options={(structures.currentData ?? []).filter((node) => node.path)}
        value={structure}
        loading={structures.isFetching}
        disabled={disabled}
        getOptionLabel={nodeLabel}
        isOptionEqualToValue={sameNode}
        onChange={(_, value) => onStructureChange(value)}
        noOptionsText="No structures found"
        renderOption={(props, node) => (
          <li
            {...props}
            key={node.path}
          >
            {nodeLabel(node)}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Structure"
            helperText={
              structures.isFetching
                ? "Loading structures…"
                : "Choose where to find users"
            }
          />
        )}
      />
      {structures.error && (
        <Alert
          severity="error"
          action={<Button onClick={structures.refetch}>Retry</Button>}
        >
          {lookupError(structures.error, "structures")}
        </Alert>
      )}
      {structure && (
        <>
          <Autocomplete
            options={(experiments.currentData ?? []).filter(
              (node) => node.path
            )}
            value={experiment}
            loading={experiments.isFetching}
            disabled={disabled || experiments.isFetching || !!experiments.error}
            getOptionLabel={nodeLabel}
            isOptionEqualToValue={sameNode}
            onChange={(_, value) => onExperimentChange(value)}
            noOptionsText="No experiments found"
            renderOption={(props, node) => (
              <li
                {...props}
                key={node.path}
              >
                {nodeLabel(node)}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Experiment"
                helperText={
                  experiments.isFetching
                    ? "Loading experiments…"
                    : "Choose an experiment in the selected structure"
                }
              />
            )}
          />
          {experiments.error && (
            <Alert
              severity="error"
              action={<Button onClick={experiments.refetch}>Retry</Button>}
            >
              {lookupError(experiments.error, "experiments")}
            </Alert>
          )}
        </>
      )}
    </Stack>
  );
}
