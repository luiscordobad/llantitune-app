import type React from "react";

type Props = {
  title: string;
  description?: string;
  right?: React.ReactNode;
};

export default function PageHeader({ title, description, right }: Props) {
  return (
    <div className="pageHeader">
      <div>
        <h1 className="h1" style={{ marginBottom: 4 }}>{title}</h1>
        {description ? <p className="p" style={{ margin: 0 }}>{description}</p> : null}
      </div>
      {right ? <div className="pageHeaderRight">{right}</div> : null}
    </div>
  );
}
