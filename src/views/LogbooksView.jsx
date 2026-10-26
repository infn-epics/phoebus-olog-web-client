import { useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Checkbox, CircularProgress,
  FormControlLabel, IconButton, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography, MenuItem
} from "@mui/material";
import { LogbookQuota } from "components/log/StoragePanel";
import LogbookExportActions from "components/log/LogbookExportActions";
import GodivaSourceSelector from "components/log/GodivaSourceSelector";
import { isExperimentResponsible } from "components/log/godivaPermissions";
import DeleteIcon from "@mui/icons-material/Delete";
import { ologApi } from "api/ologApi";
import { identityApi } from "api/identityApi";
import { useAuthData } from "src/auth/authContext";
import { useUser } from "features/authSlice";
import { useCustomSnackbar } from "src/hooks/useCustomSnackbar";

const errorMessage = (error, fallback) =>
  error?.data?.message || error?.data?.errorMessage || fallback;

const identityLabel = (item) => {
  const name = [item?.identity?.nome, item?.identity?.cognome]
    .filter(Boolean)
    .join(" ");
  return name || item?.identityTextSearchField || item?.infnUUID || "";
};

const MemberRow = ({ logbook, member }) => {
  const { currentData: identity, isFetching: identityLoading } =
    identityApi.endpoints.getIdentity.useQuery(member.infnUuid, { skip: !member.infnUuid });
  const fullName = [identity?.nome, identity?.cognome].filter(Boolean).join(" ");
  const memberLabel = fullName || member.infnUuid;
  const [permissions, setPermissions] = useState(member.permissions ?? []);
  const [visibleFrom, setVisibleFrom] = useState(member.visibleFrom ?? "");
  const [visibleTo, setVisibleTo] = useState(member.visibleTo ?? "");
  const invalidPeriod = !!visibleFrom && !!visibleTo && visibleFrom > visibleTo;
  const [updateMember, { isLoading: isUpdating }] =
    ologApi.endpoints.updateLogbookMember.useMutation();
  const [deleteMember, { isLoading: isDeleting }] =
    ologApi.endpoints.deleteLogbookMember.useMutation();
  const { enqueueSnackbar } = useCustomSnackbar();
  const isAdmin = permissions.includes("ADMIN");

  useEffect(() => setPermissions(member.permissions ?? []), [member.permissions]);
  useEffect(() => {
    setVisibleFrom(member.visibleFrom ?? "");
    setVisibleTo(member.visibleTo ?? "");
  }, [member.visibleFrom, member.visibleTo]);

  const togglePermission = (permission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  const save = async () => {
    if (permissions.length === 0) {
      enqueueSnackbar("Select at least one permission.", { severity: "warning" });
      return;
    }
    try {
      if (invalidPeriod) {
        enqueueSnackbar("From must not be after To.", { severity: "warning" });
        return;
      }
      await updateMember({ name: logbook, infnUuid: member.infnUuid, permissions, visibleFrom: visibleFrom || null, visibleTo: visibleTo || null }).unwrap();
      enqueueSnackbar("Permissions updated.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Unable to update permissions."), { severity: "error" });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${memberLabel} from ${logbook}?`)) {
      return;
    }
    try {
      await deleteMember({ name: logbook, infnUuid: member.infnUuid }).unwrap();
      enqueueSnackbar("Collaborator removed.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Unable to remove collaborator."), { severity: "error" });
    }
  };

  return (
    <TableRow>
      <TableCell title={member.infnUuid}>{identityLoading && !fullName ? "Loading…" : memberLabel}</TableCell>
      <TableCell>
        <FormControlLabel control={<Checkbox checked={permissions.includes("READ")} disabled={isAdmin} onChange={() => togglePermission("READ")} />} label="Reader" />
        <FormControlLabel control={<Checkbox checked={permissions.includes("WRITE")} disabled={isAdmin} onChange={() => togglePermission("WRITE")} />} label="Writer" />
        {isAdmin && <Typography component="span">Administrator</Typography>}
      </TableCell>
      <TableCell align="right">
        {isAdmin ? <Typography>No time limit</Typography> : <Stack gap={1}>
          <TextField type="date" label="Visible from (UTC)" size="small" InputLabelProps={{ shrink: true }} value={visibleFrom} onChange={(event) => setVisibleFrom(event.target.value)} error={invalidPeriod} />
          <TextField type="date" label="Visible to (UTC)" size="small" InputLabelProps={{ shrink: true }} value={visibleTo} onChange={(event) => setVisibleTo(event.target.value)} error={invalidPeriod} helperText={invalidPeriod ? "From must not be after To" : "Empty dates: no time limit"} />
        </Stack>}
      </TableCell>
      <TableCell align="right">
        {!isAdmin && <>
          <Button disabled={isUpdating || isDeleting || invalidPeriod} onClick={save}>Save</Button>
          <IconButton aria-label={`Remove ${memberLabel}`} disabled={isUpdating || isDeleting} onClick={remove}><DeleteIcon /></IconButton>
        </>}
      </TableCell>
    </TableRow>
  );
};

const LogbooksView = () => {
  const { isAuthenticated, isAuthenticating, authError, logIn, token } = useAuthData();
  const user = useUser();
  const { enqueueSnackbar } = useCustomSnackbar();
  const [newName, setNewName] = useState("");
  const [creationMode, setCreationMode] = useState("manual");
  const [structure, setStructure] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [selectedLogbook, setSelectedLogbook] = useState("");
  const [identitySearch, setIdentitySearch] = useState("");
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [newPermissions, setNewPermissions] = useState(["READ"]);
  const [visibleFrom, setVisibleFrom] = useState("");
  const [visibleTo, setVisibleTo] = useState("");
  const invalidPeriod = !!visibleFrom && !!visibleTo && visibleFrom > visibleTo;

  const { currentData: logbookPermissions = [], isFetching: isLoading, error: logbooksError, refetch: reloadLogbooks } =
    ologApi.endpoints.getMyLogbookPermissions.useQuery(undefined, {
      skip: !isAuthenticated,
      refetchOnMountOrArgChange: true
    });
  const storage = ologApi.endpoints.getStorageSummary.useQuery(undefined, {
    skip: !isAuthenticated, refetchOnMountOrArgChange: true
  });
  const storageByLogbook = new Map((storage.currentData?.logbooks ?? []).map((item) => [item.logbook, item]));
  const selectedLogbookIsAdmin = logbookPermissions.some((item) =>
    item.logbook === selectedLogbook && (item.admin || item.permissions?.includes("ADMIN"))
  );
  const [createLogbook, { isLoading: isCreating }] = ologApi.endpoints.createLogbook.useMutation();
  const [deleteLogbook] = ologApi.endpoints.deleteLogbook.useMutation();
  const { data: members = [], isFetching: membersLoading } =
    ologApi.endpoints.getLogbookMembers.useQuery({ name: selectedLogbook }, { skip: !selectedLogbook || !selectedLogbookIsAdmin || !isAuthenticated });
  const [addMember, { isLoading: isAdding }] = ologApi.endpoints.addLogbookMember.useMutation();
  const [searchIdentities, { data: identities = [], isFetching: identitiesLoading }] =
    identityApi.endpoints.searchIdentities.useLazyQuery();
  const authorization = identityApi.endpoints.getIdentityAuthorization.useQuery(user?.uuid, {
    skip: !isAuthenticated || creationMode !== "godiva" || !user?.uuid,
    refetchOnMountOrArgChange: true
  });
  const canCreateFromGodiva = !!structure?.path && !!experiment?.path &&
    !authorization.isFetching && !authorization.error &&
    isExperimentResponsible(authorization.currentData, experiment);

  const accessibleLogbooks = useMemo(
    () => logbookPermissions.filter((item) => item.admin ||
      item.permissions?.some((permission) => ["READ", "WRITE", "ADMIN"].includes(permission)))
      .map((item) => ({ name: item.logbook, permissions: item.permissions ?? [],
        admin: item.admin || item.permissions?.includes("ADMIN") })),
    [logbookPermissions]
  );

  useEffect(() => {
    const search = identitySearch.trim();
    if (!isAuthenticated || search.length < 2) return undefined;
    const timer = window.setTimeout(() => searchIdentities({ search }, true), 350);
    return () => window.clearTimeout(timer);
  }, [identitySearch, searchIdentities, isAuthenticated]);

  if (isAuthenticating) {
    return <Stack role="status" alignItems="center" gap={2} p={5}>
      <CircularProgress />
      <Typography>Signing in…</Typography>
    </Stack>;
  }

  if (!isAuthenticated) {
    return <Stack alignItems="center" gap={2} p={5}>
      <Alert severity={authError ? "error" : "info"}>
        {authError ? "Unable to complete sign-in. Please try again." : "Sign in with OAuth2 to manage logbooks."}
      </Alert>
      <Button variant="contained" onClick={() => logIn()}>Sign in</Button>
    </Stack>;
  }

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    if (creationMode === "godiva" && !canCreateFromGodiva) return;
    try {
      await createLogbook({
        name,
        officialExperiment: creationMode === "godiva",
        experimentLdapPath: creationMode === "godiva"
          ? experiment.path.replace(/:+$/, "")
          : null
      }).unwrap();
      setNewName("");
      setStructure(null);
      setExperiment(null);
      setCreationMode("manual");
      setSelectedLogbook(name);
      enqueueSnackbar("Logbook created.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Unable to create logbook."), { severity: "error" });
    }
  };

  const removeLogbook = async (name) => {
    if (!window.confirm(`Delete the logbook ${name}?`)) return;
    try {
      await deleteLogbook({ name }).unwrap();
      if (selectedLogbook === name) setSelectedLogbook("");
      enqueueSnackbar("Logbook deleted.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Unable to delete logbook."), { severity: "error" });
    }
  };

  const toggleNewPermission = (permission) => {
    setNewPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  };

  const add = async () => {
    if (!selectedIdentity?.infnUUID || newPermissions.length === 0) return;
    try {
      if (invalidPeriod) {
        return;
      }
      await addMember({ name: selectedLogbook, infnUuid: selectedIdentity.infnUUID, permissions: newPermissions, visibleFrom: visibleFrom || null, visibleTo: visibleTo || null }).unwrap();
      setSelectedIdentity(null);
      setIdentitySearch("");
      setNewPermissions(["READ"]);
      setVisibleFrom("");
      setVisibleTo("");
      enqueueSnackbar("Collaborator added.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Unable to add collaborator."), { severity: "error" });
    }
  };

  return <Stack gap={3} p={4} maxWidth="1100px" width="100%" mx="auto">
    <Typography variant="h4">Logbooks</Typography>
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Create a logbook</Typography>
      <Stack gap={2} mb={2}>
        <TextField select label="User source" value={creationMode} disabled={isCreating} onChange={(event) => {
          setCreationMode(event.target.value);
          setStructure(null);
          setExperiment(null);
        }}>
          <MenuItem value="manual">Manual selection</MenuItem>
          <MenuItem value="godiva">Godiva — structure and experiment</MenuItem>
        </TextField>
        {creationMode === "godiva" && <Alert severity="info">Select the experiment for this official logbook. Experiment affiliates can read it automatically; administrators can grant write access to individual collaborators.</Alert>}
        {creationMode === "godiva" && <GodivaSourceSelector
          structure={structure}
          experiment={experiment}
          disabled={isCreating}
          onStructureChange={(value) => { setStructure(value); setExperiment(null); }}
          onExperimentChange={setExperiment}
        />}
        {creationMode === "godiva" && authorization.isFetching && <Typography role="status">Checking experiment responsibilities…</Typography>}
        {creationMode === "godiva" && authorization.error && <Alert severity="error" action={<Button onClick={authorization.refetch}>Retry</Button>}>Unable to verify your experiment responsibilities.</Alert>}
        {creationMode === "godiva" && !user?.uuid && <Alert severity="error">Unable to identify the signed-in user.</Alert>}
        {creationMode === "godiva" && experiment && user?.uuid && !authorization.isFetching && !authorization.error && !canCreateFromGodiva && <Alert severity="warning">Only a responsible person for the selected experiment can create this logbook.</Alert>}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField label="Logbook name" value={newName} onChange={(event) => setNewName(event.target.value)} fullWidth />
        <Button variant="contained" disabled={!newName.trim() || isCreating || (creationMode === "godiva" && !canCreateFromGodiva)} onClick={create}>Create</Button>
      </Stack>
    </Paper>

    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Your logbooks</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>Each logbook has its own quota. Usage includes JSON data in Elasticsearch, log entries and archived versions; binary attachments in MongoDB are excluded.</Typography>
      {storage.error && <Alert severity="error" action={<Button onClick={storage.refetch}>Retry</Button>}>Unable to calculate storage usage.</Alert>}
      {logbooksError && <Alert severity="error" action={<Button onClick={reloadLogbooks}>Retry</Button>}>
        {errorMessage(logbooksError, "Unable to load your logbooks. Please retry.")}
      </Alert>}
      {!logbooksError && (isLoading ? <CircularProgress aria-label="Loading logbooks" /> : accessibleLogbooks.length === 0
        ? <Typography color="text.secondary">No accessible logbooks.</Typography>
        : <Box sx={{ overflowX: "auto" }}><Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Storage quota</TableCell><TableCell>Permissions</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{accessibleLogbooks.map((logbook) =>
            <TableRow key={logbook.name} selected={selectedLogbook === logbook.name}>
              <TableCell>{logbook.name}</TableCell>
              <TableCell>{storageByLogbook.has(logbook.name)
                ? <LogbookQuota logbook={storageByLogbook.get(logbook.name)} />
                : storage.isFetching ? "Loading…" : storage.error ? "Unavailable" : "—"}</TableCell>
              <TableCell>{logbook.admin ? "Administrator" : logbook.permissions.join(" / ")}</TableCell>
              <TableCell align="right">
                <Button component="a" href={`/logs?logbooks=${encodeURIComponent(logbook.name)}`}>Open</Button>
                {logbook.admin && <>
                  <Button onClick={() => setSelectedLogbook(logbook.name)}>Manage</Button>
                  <LogbookExportActions name={logbook.name} token={token} />
                  <IconButton aria-label={`Delete ${logbook.name}`} onClick={() => removeLogbook(logbook.name)}><DeleteIcon /></IconButton>
                </>}
              </TableCell>
            </TableRow>)}</TableBody>
        </Table></Box>)}
    </Paper>

    {selectedLogbook && selectedLogbookIsAdmin && <Paper sx={{ p: 3 }}>
      <Typography variant="h6">Collaborators — {selectedLogbook}</Typography>
      <Box mt={2}>
        <Autocomplete
          options={identities}
          value={selectedIdentity}
          inputValue={identitySearch}
          loading={identitiesLoading}
          getOptionLabel={identityLabel}
          isOptionEqualToValue={(option, value) => option.infnUUID === value.infnUUID}
          onInputChange={(_, value) => setIdentitySearch(value)}
          onChange={(_, value) => setSelectedIdentity(value)}
          renderOption={(props, option) => <li {...props} key={option.infnUUID}>{identityLabel(option)} — {option.infnUUID}</li>}
          renderInput={(params) => <TextField {...params} label="Search INFN identity" helperText="Enter at least two characters" />}
        />
        <Stack direction="row" alignItems="center" gap={1} mt={1}>
          <FormControlLabel control={<Checkbox checked={newPermissions.includes("READ")} onChange={() => toggleNewPermission("READ")} />} label="Reader" />
          <FormControlLabel control={<Checkbox checked={newPermissions.includes("WRITE")} onChange={() => toggleNewPermission("WRITE")} />} label="Writer" />
          <Button variant="contained" disabled={!selectedIdentity || newPermissions.length === 0 || isAdding || invalidPeriod} onClick={add}>Add collaborator</Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} mt={2}>
          <TextField type="date" label="Visible from (UTC)" InputLabelProps={{ shrink: true }} value={visibleFrom} onChange={(event) => setVisibleFrom(event.target.value)} error={invalidPeriod} />
          <TextField type="date" label="Visible to (UTC)" InputLabelProps={{ shrink: true }} value={visibleTo} onChange={(event) => setVisibleTo(event.target.value)} error={invalidPeriod} helperText={invalidPeriod ? "From must not be after To" : ""} />
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={1}>Visibility is based on the entry creation date, including both days (UTC). Leave dates empty for unrestricted history.</Typography>
      </Box>
      {membersLoading ? <CircularProgress sx={{ mt: 2 }} /> : <Table size="small" sx={{ mt: 2 }}>
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Permissions</TableCell><TableCell>Visibility period</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>{members.map((member) => <MemberRow key={member.infnUuid} logbook={selectedLogbook} member={member} />)}</TableBody>
      </Table>}
    </Paper>}
  </Stack>;
};

export default LogbooksView;
