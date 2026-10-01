import { createFileRoute } from "@tanstack/react-router";
import { AccountsPage } from "./accounts";

export const Route = createFileRoute("/accounting")({
  head: () => ({
    meta: [
      { title: "النظام المالي والمحاسبي المتكامل | السوق الشامل" },
      {
        name: "description",
        content:
          "إدارة السيولة والصناديق وسندات القبض والصرف بالدولار والريال السعودي والريال اليمني.",
      },
    ],
  }),
  component: AccountsPage,
});

export default AccountsPage;
