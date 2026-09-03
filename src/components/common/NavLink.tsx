import { NavLink as RouterNavLink, type NavLinkProps, type NavLinkRenderProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string | ((props: NavLinkRenderProps) => string | undefined);
  activeClassName?: string;
  pendingClassName?: string;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={(renderProps) => {
          const resolvedClass = typeof className === "function" ? className(renderProps) : className;
          return cn(
            resolvedClass,
            renderProps.isActive && activeClassName,
            renderProps.isPending && pendingClassName,
          );
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";
