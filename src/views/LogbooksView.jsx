import { useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Checkbox, CircularProgress,
  FormControlLabel, IconButton, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { ologApi } from "api/ologApi";
import { identityApi } from "api/identityApi";
import { useAuthData } from "src/auth/authContext";
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
  const { isAuthenticated, isAuthenticating, authError, logIn } = useAuthData();
  const { enqueueSnackbar } = useCustomSnackbar();
  const [newName, setNewName] = useState("");
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
  const [createLogbook, { isLoading: isCreating }] = ologApi.endpoints.createLogbook.useMutation();
  const [deleteLogbook] = ologApi.endpoints.deleteLogbook.useMutation();
  const { data: members = [], isFetching: membersLoading } =
    ologApi.endpoints.getLogbookMembers.useQuery({ name: selectedLogbook }, { skip: !selectedLogbook || !isAuthenticated });
  const [addMember, { isLoading: isAdding }] = ologApi.endpoints.addLogbookMember.useMutation();
  const [searchIdentities, { data: identities = [], isFetching: identitiesLoading }] =
    identityApi.endpoints.searchIdentities.useLazyQuery();

  const managedLogbooks = useMemo(
    () => logbookPermissions.filter((item) => item.admin || item.permissions?.includes("ADMIN"))
      .map((item) => ({ name: item.logbook })),
    [logbookPermissions]
  );

  useEffect(() => {
    const search = identitySearch.trim();
    if (!isAuthenticated || search.length < 2) {return undefined;}
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
    if (!name) {return;}
    try {
      await createLogbook({ name }).unwrap();
      setNewName("");
      setSelectedLogbook(name);
      enqueueSnackbar("Logbook created.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Unable to create logbook."), { severity: "error" });
    }
  };

  const removeLogbook = async (name) => {
    if (!window.confirm(`Delete the logbook ${name}?`)) {return;}
    try {
      await deleteLogbook({ name }).unwrap();
      if (selectedLogbook === name) {setSelectedLogbook("");}
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
    if (!selectedIdentity?.infnUUID || newPermissions.length === 0) {return;}
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
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField label="Logbook name" value={newName} onChange={(event) => setNewName(event.target.value)} fullWidth />
        <Button variant="contained" disabled={!newName.trim() || isCreating} onClick={create}>Create</Button>
      </Stack>
    </Paper>

    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" mb={2}>Your logbooks</Typography>
      {logbooksError && <Alert severity="error" action={<Button onClick={reloadLogbooks}>Retry</Button>}>
        {errorMessage(logbooksError, "Unable to load your logbooks. Please retry.")}
      </Alert>}
      {!logbooksError && isLoading && <CircularProgress aria-label="Loading logbooks" />}
      {!logbooksError && !isLoading && managedLogbooks.length === 0 &&
        <Typography color="text.secondary">You do not administer any logbooks.</Typography>}
      {!logbooksError && !isLoading && managedLogbooks.length > 0 &&
        <Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{managedLogbooks.map((logbook) =>
            <TableRow key={logbook.name} selected={selectedLogbook === logbook.name}>
              <TableCell>{logbook.name}</TableCell>
              <TableCell align="right">
                <Button onClick={() => setSelectedLogbook(logbook.name)}>Manage</Button>
                <IconButton aria-label={`Delete ${logbook.name}`} onClick={() => removeLogbook(logbook.name)}><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>)}</TableBody>
        </Table>}
    </Paper>

    {selectedLogbook && <Paper sx={{ p: 3 }}>
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
