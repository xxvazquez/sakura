$(document).ready(function () {

    $("#numbersTable").DataTable({

        paging:false,
        info:false,
        ordering:true,
        searching:true,
      
        // Default sort by the 3rd column asc
        order: [[3, "asc"]],

        language:{
            search:"",
            searchPlaceholder:"Search..."
        }

    });

});


