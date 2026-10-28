import { forwardRef } from 'react';
import Icon, { type IconName } from './Icon';
import Kbd from './Kbd';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** Skrót klawiszowy pokazywany w przycisku, np. 'Enter' albo ['Ctrl', 'K']. */
  kbd?: string | string[];
  block?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, kbd, block, className, type = 'button', children, ...rest },
  ref,
) {
  const classes = ['btn', `btn-${variant}`];
  if (size !== 'md') classes.push(`btn-${size}`);
  if (block) classes.push('btn-block');
  if (className) classes.push(className);
  const shortcut = kbd ? (Array.isArray(kbd) ? kbd.join('+') : kbd) : undefined;

  return (
    <button ref={ref} type={type} className={classes.join(' ')} aria-keyshortcuts={shortcut} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {kbd && <Kbd keys={kbd} />}
    </button>
  );
});

export default Button;
