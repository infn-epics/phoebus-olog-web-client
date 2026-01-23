import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Backdrop, CircularProgress } from "@mui/material";
import { EntryEditor } from "../EntryEditor";
import { useAuthData } from "src/auth/authContext";
import { ologApi } from "api/ologApi";
import { useWebSockets } from "src/hooks/useWebSockets";
import { useCustomSnackbar } from "src/hooks/useCustomSnackbar";

const EditLog = ({ log }) => {
  const { updatedLogEntryId, setUpdatedLogEntryId } = useWebSockets();
  const { enqueueSnackbar } = useCustomSnackbar();
  const [editInProgress, setEditInProgress] = useState(false);
  const [editLog] = ologApi.endpoints.editLog.useMutation();
  const { token, isTokenExpired, logIn } = useAuthData();
  const navigate = useNavigate();


  useEffect(() => {
    if (
      updatedLogEntryId &&
      Number(updatedLogEntryId) === log?.id &&
      !editInProgress
    ) {
      enqueueSnackbar(
        "This log entry has been updated. Please refresh the page.",
        {
          severity: "warning",
          autoHideDuration: null,
          id: log?.id
        }
      );
    }
  }, [editInProgress, enqueueSnackbar, log?.id, updatedLogEntryId]);

  useEffect(() => {
    return () => {
      setUpdatedLogEntryId(null);
    };
  }, [setUpdatedLogEntryId]);

  const form = useForm({
    defaultValues: {
      attachments: []
    },
    values: {
      ...log,
      level: { name: log.level, defaultLevel: false }
    }
  });

  const onSubmit = async (formData) => {
    if (!formData) {
      setEditInProgress(false);
      return;
    }

    // Verifica scadenza token prima di procedere
    if (isTokenExpired()) {
      // opzionale: puoi lanciare un re-login, o mostrare un messaggio all’utente
      try {
        localStorage.setItem("formDataBackup", JSON.stringify(formData));
        // await logIn(); // potrebbe fare redirect/popup a seconda della config
        // Nota: se il flusso fa redirect, il codice dopo non verrà eseguito ora
      } catch (e) {
        alert("Sessione scaduta. Effettua nuovamente il login." + e.message);
        setEditInProgress(false);
        return;
      }
    }


    setEditInProgress(true);

    const body = {
      id: log.id,
      logbooks: formData.logbooks,
      tags: formData.tags,
      properties: formData.properties,
      title: formData.title,
      level: formData.level?.name,
      description: formData.description,
      attachments: formData.attachments ?? []
    };


    editLog({ log: body, token: token })
          .unwrap()
          .then((data) => {
            setEditInProgress(false);
            navigate(`/logs/${data.id}`);
          })
          .catch((error) => {
            setUpdatedLogEntryId(null);
            setEditInProgress(false);
            enqueueSnackbar("Failed to edit log entry. Please try again later.", {
              variant: "error"
            });
            console.error("Failed to edit log entry.", error);
            return error;
          });
      }

  return (
    <>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={editInProgress}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <EntryEditor
        {...{
          form,
          title: `Edit Log "${log?.title}"`,
          onSubmit,
          submitDisabled: !form.formState.isDirty,
          attachmentsDisabled: false,
          isEditing: true,
        }}
      />
    </>
  );
};
export default EditLog;
