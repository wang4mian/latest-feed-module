---
enable: true # Control the visibility of this section across all pages where it is used
title: "Contactez-nous pour plus d'**informations**"
description: "Si vous cherchez une assistance experte, notre équipe dédiée est prête à vous soutenir à chaque étape du processus."
subtitle: "Contact"

contact_list:
  enable: true
  list:
    - icon: "/images/icons/svg/phone.svg"
      label: "Appelez-nous maintenant"
      value: "+1-202-555-0190"
    - icon: "/images/icons/svg/email.svg"
      label: "Envoyez-nous un e-mail"
      value: "example@gmail.com"
    - icon: "/images/icons/svg/whatsapp.svg"
      label: "Discutez avec nous"
      value: "@example"

social:
  enable: true
  title: "Suivez-nous sur les réseaux sociaux"
  # # uncomment below list if you want to override `src/config/social.json` data
  # list:
  #   - enable: true
  #     label: "facebook"
  #     icon: "/images/icons/svg/facebook.svg"
  #     url: "/"

# Check config.toml file for form action related settings
form:
  email_subject: "Nouvelle soumission de formulaire depuis le site web Upstart" # Customized email subject (applicable when anyone submit form, form submission may receive by email depend on provider)
  submit_button:
    label: "Soumettre"
  # This note will show at the end of form
  # note: |
  #   Vos données sont en sécurité avec nous. Nous respectons votre vie privée et ne partageons jamais vos informations. <br /> Lisez notre [Politique de confidentialité](/privacy-policy/).
  inputs:
    - label: ""
      placeholder: "Nom complet"
      name: "Nom complet" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      half_width: true
      default_value: ""
    - label: ""
      placeholder: "Adresse e-mail"
      name: "Adresse e-mail" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      type: "email"
      half_width: true
      default_value: ""
    - label: ""
      placeholder: "Numéro de téléphone"
      name: "Numéro de téléphone" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      type: "text"
      half_width: true
      default_value: ""
    - label: ""
      placeholder: "Entreprise"
      name: "Entreprise" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      type: "text"
      half_width: true
      default_value: ""
    - label: ""
      placeholder: "Objet"
      name: "Objet" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      half_width: true
      dropdown:
        type: "" # select | search - default is select
        search: # if type is search then it will work
          placeholder: ""
        items:
          - label: "Exemple 01"
            value: "Exemple 01"
          - label: "Exemple 02"
            value: "Exemple 02"
          - label: "Exemple 03"
            value: "Exemple 03"
    - label: ""
      placeholder: "Objet avec recherche"
      name: "Objet avec recherche" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      half_width: true
      dropdown:
        type: "search" # select | search - default is select
        search: # if type is search then it will work
          placeholder: "Objet avec recherche"
        items:
          - label: "Lowni Saiki"
            value: "Lowni Saiki"
          - label: "Sikow Pow"
            value: "Sikow Pow"
          - label: "Kenbi Shaktun"
            value: "Kenbi Shaktun"
          - label: "Aruyyo Kawn"
            value: "Aruyyo Kawn"
          - label: "Marong Lowbbi"
            value: "Marong Lowbbi"
    - label: ""
      tag: "textarea"
      default_value: ""
      rows: "4" # Only work if tag is textarea
      placeholder: "Entrez votre message."
      name: "Message" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      half_width: false
    - label: "Google Search" # only valid for type="checkbox" & type === "radio"
      checked: false # only valid for type="checkbox" & type === "radio"
      name: "User Source" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      group_label: "Comment avez-vous entendu parler de nous?" # Radio Inputs Label
      group: "source" # when you add group then it will omit space between the same group radio input
      type: "radio"
      half_width: true
      default_value: ""
    - label: "Social Media" # only valid for type="checkbox" & type === "radio"
      name: "User Source" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      group_label: "" # Radio Inputs Label
      group: "source" # when you add group then it will omit space between the same group radio input
      type: "radio"
      half_width: true
      default_value: ""
    - label: "Referral" # only valid for type="checkbox" & type === "radio"
      name: "User Source" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      group_label: "" # Radio Inputs Label
      group: "source" # when you add group then it will omit space between the same group radio input
      type: "radio"
      half_width: true
      default_value: ""
    - label: "Autre" # only valid for type="checkbox" & type === "radio"
      name: "User Source" # This is crucial. Its indicate under which name you want to receive this field data
      required: true
      group_label: "" # Radio Inputs Label
      group: "source" # when you add group then it will omit space between the same group radio input
      type: "radio"
      half_width: true
      default_value: ""
    - label: "J'accepte les termes et conditions et la [politique de confidentialité](/contact/)." # only valid for type="checkbox" & type === "radio"
      name: "Agreed Privacy" # This is crucial. Its indicate under which name you want to receive this field data
      value: "Agreed" # Value that will be submit (applicable for type="checkbox" & type === "radio")
      checked: false # only valid for type="checkbox" & type === "radio"
      required: true
      type: "checkbox"
      half_width: false
      default_value: ""
    - note: success # info | warning | success | deprecated | hint
      parent_class: "hidden message success"
      content: We have received your message! We'll get back to you as soon as possible.
    - note: warning # info | warning | success | deprecated | hint
      parent_class: "hidden message error"
      content: Something went wrong! please use this mail - [upstart-astro-theme@gmail.com](mailto:upstart-astro-theme@gmail.com) to submit a ticket!
    # - note: info # info | warning | success | deprecated | hint
    #   parent_class: "text-sm message success"
    #   content: We have received your message! We'll get back to you as soon as possible.
    # - note: warning # info | warning | success | deprecated | hint
    #   parent_class: "text-sm message error"
    #   content: Something went wrong! please use this mail - [upstart-astro-theme@gmail.com](mailto:upstart-astro-theme@gmail.com) to submit a ticket!
    # - note: success # info | warning | success | deprecated | hint
    #   parent_class: "text-sm message success"
    #   content: We have received your message! We'll get back to you as soon as possible.
    # - note: deprecated # info | warning | success | deprecated | hint
    #   parent_class: "text-sm message error"
    #   content: Something went wrong! please use this mail - [upstart-astro-theme@gmail.com](mailto:upstart-astro-theme@gmail.com) to submit a ticket!
    # - note: hint # info | warning | success | deprecated | hint
    #   parent_class: "text-sm message error"
    #   content: Something went wrong! please use this mail - [upstart-astro-theme@gmail.com](mailto:upstart-astro-theme@gmail.com) to submit a ticket!
    # - note: we # info | warning | success | deprecated | hint
    #   parent_class: "text-sm message error"
    #   content: Something went wrong! please use this mail - [upstart-astro-theme@gmail.com](mailto:upstart-astro-theme@gmail.com) to submit a ticket!
---
