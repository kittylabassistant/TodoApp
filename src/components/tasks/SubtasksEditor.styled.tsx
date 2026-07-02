import styled from "@emotion/styled";

export const Container = styled.div`
  margin: 18px 0 10px;
`;

export const SectionHeader = styled.div`
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 1rem;
  }

  span {
    opacity: 0.75;
    font-size: 0.9rem;
  }
`;

export const SubtasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
`;

export const SubtaskItem = styled.div<{ done: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: ${({ theme }) => (theme.darkmode ? "#ffffff0b" : "#00000008")};
  opacity: ${({ done }) => (done ? 0.72 : 1)};
`;

export const SubtaskInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;

  span {
    word-break: break-word;
  }
`;
