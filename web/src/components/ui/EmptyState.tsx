import Icon, { type IconName } from './Icon';

/** Pusty stan: co się tu pojawi i jaki jest następny krok. */
export default function EmptyState({ title, text, icon, action, className }: {
  title: string;
  text?: React.ReactNode;
  icon?: IconName;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `empty ${className}` : 'empty'}>
      {icon && <span className="empty-icon"><Icon name={icon} size={20} /></span>}
      <h3 className="empty-title">{title}</h3>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}
