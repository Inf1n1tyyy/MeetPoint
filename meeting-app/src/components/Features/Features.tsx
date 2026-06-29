import styles from "./Features.module.scss";

const features = [
  {
    title: "Создание встреч",
    description: "Организуйте мероприятия любой тематики.",
  },

  {
    title: "Общение в реальном времени",
    description: "Общайтесь в чатах до и после встречи.",
  },

  {
    title: "Поиск по интересам",
    description: "Находите мероприятия через фильтры и поиск.",
  },

  {
    title: "Друзья и сообщества",
    description: "Добавляйте друзей и создавайте собственные чаты.",
  },
];

export const Features = () => {
  return (
    <section className={styles.features}>
      {features.map((feature) => (
        <div key={feature.title} className={styles.card}>
          <h3>{feature.title}</h3>

          <p>{feature.description}</p>
        </div>
      ))}
    </section>
  );
};
