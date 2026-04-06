interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
    <div>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
