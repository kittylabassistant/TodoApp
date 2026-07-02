import {
  AddRounded,
  CheckCircleRounded,
  DeleteOutlineRounded,
  RadioButtonUncheckedRounded,
  SubdirectoryArrowRightRounded,
} from "@mui/icons-material";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useMemo, useState } from "react";
import { SUBTASK_NAME_MAX_LENGTH } from "../../constants";
import type { Subtask } from "../../types/user";
import { generateUUID, showToast } from "../../utils";
import {
  Container,
  SectionHeader,
  SubtaskInfo,
  SubtaskItem,
  SubtasksList,
} from "./SubtasksEditor.styled";

interface SubtasksEditorProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export const SubtasksEditor = ({ subtasks, onChange }: SubtasksEditorProps) => {
  const [draftTitle, setDraftTitle] = useState("");

  const titleError = useMemo(() => {
    if (draftTitle.length <= SUBTASK_NAME_MAX_LENGTH) {
      return "";
    }

    return `Subtask title must be ${SUBTASK_NAME_MAX_LENGTH} characters or fewer.`;
  }, [draftTitle]);

  const completedSubtasks = useMemo(
    () => subtasks.filter((subtask) => subtask.done).length,
    [subtasks],
  );

  const addSubtask = () => {
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle) {
      showToast("Subtask title is required.", { type: "error" });
      return;
    }

    if (trimmedTitle.length > SUBTASK_NAME_MAX_LENGTH) {
      return;
    }

    onChange([
      ...subtasks,
      {
        id: generateUUID(),
        title: trimmedTitle,
        done: false,
      },
    ]);
    setDraftTitle("");
  };

  const toggleSubtask = (subtaskId: Subtask["id"]) => {
    onChange(
      subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
      ),
    );
  };

  const deleteSubtask = (subtaskId: Subtask["id"]) => {
    onChange(subtasks.filter((subtask) => subtask.id !== subtaskId));
  };

  return (
    <Container>
      <SectionHeader>
        <div>
          <h3>Subtasks</h3>
          <span>
            {subtasks.length > 0
              ? `${completedSubtasks}/${subtasks.length} completed`
              : "Break the task into smaller steps."}
          </span>
        </div>
      </SectionHeader>

      <TextField
        fullWidth
        label="Add subtask"
        autoComplete="off"
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addSubtask();
          }
        }}
        error={titleError !== ""}
        helperText={
          draftTitle === ""
            ? undefined
            : titleError || `${draftTitle.length}/${SUBTASK_NAME_MAX_LENGTH}`
        }
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  color="primary"
                  aria-label="Add subtask"
                  onClick={addSubtask}
                  disabled={draftTitle.trim() === "" || titleError !== ""}
                >
                  <AddRounded />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      {subtasks.length > 0 && (
        <SubtasksList>
          {subtasks.map((subtask) => (
            <SubtaskItem key={subtask.id} done={subtask.done}>
              <SubtaskInfo>
                <IconButton
                  onClick={() => toggleSubtask(subtask.id)}
                  aria-label={subtask.done ? "Mark subtask as not done" : "Mark subtask as done"}
                >
                  {subtask.done ? (
                    <CheckCircleRounded color="success" />
                  ) : (
                    <RadioButtonUncheckedRounded />
                  )}
                </IconButton>
                <SubdirectoryArrowRightRounded fontSize="small" />
                <span translate="no">{subtask.title}</span>
              </SubtaskInfo>

              <IconButton
                color="error"
                onClick={() => deleteSubtask(subtask.id)}
                aria-label="Delete subtask"
              >
                <DeleteOutlineRounded />
              </IconButton>
            </SubtaskItem>
          ))}
        </SubtasksList>
      )}
    </Container>
  );
};
