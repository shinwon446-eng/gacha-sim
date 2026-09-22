import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** 로케일 접두어를 자동으로 붙이는 Link / useRouter / usePathname */
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
